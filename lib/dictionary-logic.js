const RESULT_LIMIT = 60;

export function normalizeEnglish(value) {
  return value
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeKorean(value) {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeDisplayForm(value) {
  return normalizeEnglish(value.replace(/[?!.,]/g, " "));
}

function levenshtein(a, b) {
  const rows = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i += 1) {
    rows[i][0] = i;
  }

  for (let j = 0; j <= b.length; j += 1) {
    rows[0][j] = j;
  }

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      rows[i][j] = Math.min(
        rows[i - 1][j] + 1,
        rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + cost
      );
    }
  }

  return rows[a.length][b.length];
}

export function comparePronunciation(targetForms, transcript) {
  const normalizedTranscript = normalizeEnglish(transcript.replace(/[^\w\s'-]/g, " "));
  const normalizedTargets = targetForms.map((value) => normalizeEnglish(value));

  let bestScore = 0;
  let bestTarget = normalizedTargets[0] ?? "";

  for (const target of normalizedTargets) {
    if (!target) {
      continue;
    }

    const distance = levenshtein(target, normalizedTranscript);
    const score = Math.max(
      0,
      Math.round((1 - distance / Math.max(target.length, normalizedTranscript.length || 1)) * 100)
    );

    if (score > bestScore) {
      bestScore = score;
      bestTarget = target;
    }
  }

  if (bestScore >= 92 || normalizedTargets.includes(normalizedTranscript)) {
    return {
      status: "excellent",
      text: `잘했어요. "${transcript}" 발음이 ${bestTarget}와 매우 가깝습니다.`
    };
  }

  if (bestScore >= 72) {
    return {
      status: "good",
      text: `거의 맞았어요. "${transcript}"로 들렸습니다. 한 번 더 또박또박 말해 보세요.`
    };
  }

  return {
    status: "retry",
    text: `지금은 "${transcript}"로 인식됐습니다. 입 모양과 강세를 조금 더 크게 말해 보세요.`
  };
}

function mergeStats(baseStats = {}, extraStats = {}) {
  const merged = { ...baseStats };

  for (const [key, value] of Object.entries(extraStats)) {
    if (typeof value !== "number") {
      continue;
    }

    merged[key] = (merged[key] ?? 0) + value;
  }

  return merged;
}

export function mergeDictionaries(baseDictionary, extraDictionary = null) {
  if (!extraDictionary) {
    return baseDictionary;
  }

  return {
    generatedAt: extraDictionary.generatedAt ?? baseDictionary.generatedAt,
    sources: [...(baseDictionary.sources ?? []), ...(extraDictionary.sources ?? [])],
    stats: mergeStats(baseDictionary.stats, extraDictionary.stats),
    words: [...baseDictionary.words, ...extraDictionary.words]
  };
}

export function mergeExampleSentences(dictionary, examplePayload = null) {
  if (!examplePayload) {
    return dictionary;
  }

  const exampleMap = new Map(examplePayload.items.map((item) => [item.id, item.exampleSentence]));

  return {
    ...dictionary,
    words: dictionary.words.map((word) => ({
      ...word,
      exampleSentence: exampleMap.get(word.id) ?? ""
    }))
  };
}

export async function loadDictionaryData({ files, loadFile }) {
  const { base, supplemental, textbookExpressions, exampleSentences } = files;
  const [baseDictionary, supplementalDictionary, textbookExpressionsDictionary, examplePayload] =
    await Promise.all([
      loadFile(base.path, { optional: base.optional ?? false }),
      loadFile(supplemental.path, { optional: supplemental.optional ?? false }),
      loadFile(textbookExpressions.path, { optional: textbookExpressions.optional ?? false }),
      loadFile(exampleSentences.path, { optional: exampleSentences.optional ?? false })
    ]);

  const mergedDictionary = [baseDictionary, supplementalDictionary, textbookExpressionsDictionary]
    .filter(Boolean)
    .reduce((merged, current) => mergeDictionaries(merged, current));

  return mergeExampleSentences(mergedDictionary, examplePayload);
}

export function scoreMatch(word, query) {
  if (!query) {
    return 0;
  }

  const englishPool = word.searchKeywords.english.join(" ");
  const koreanPool = word.searchKeywords.korean.join(" ");

  if (englishPool === query || koreanPool === query) {
    return 400;
  }

  if (word.word.toLowerCase() === query) {
    return 350;
  }

  if (word.searchKeywords.english.some((value) => value.startsWith(query))) {
    return 220;
  }

  if (word.searchKeywords.korean.some((value) => value.startsWith(query))) {
    return 200;
  }

  if (englishPool.includes(query)) {
    return 140;
  }

  if (koreanPool.includes(query)) {
    return 130;
  }

  return 0;
}

export function filterWords({ words, rawQuery, category, limit = RESULT_LIMIT }) {
  const englishQuery = normalizeEnglish(rawQuery.trim());
  const koreanQuery = normalizeKorean(rawQuery.trim());

  let visibleWords = words;

  if (category !== "all") {
    visibleWords = visibleWords.filter((word) => word.category === category);
  }

  if (!rawQuery.trim()) {
    const ordered = [...visibleWords].sort((left, right) => left.id - right.id);
    return ordered.slice(0, limit);
  }

  return visibleWords
    .map((word) => ({
      word,
      score: Math.max(scoreMatch(word, englishQuery), scoreMatch(word, koreanQuery))
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.word.id - right.word.id)
    .slice(0, limit)
    .map((item) => item.word);
}
