const RESULT_LIMIT = 60;

const SCORE = {
  primaryExact: 500,
  englishExact: 480,
  koreanExact: 460,
  englishPrefix: 320,
  koreanPrefix: 300,
  englishContains: 180,
  koreanContains: 160
};

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

export function getDetailHeading(word) {
  if (!word?.exampleSentence) {
    return "설명";
  }

  const isExpression =
    String(word.category ?? "").endsWith("expressions") || !/^[A-Za-z-]+$/.test(String(word.word ?? ""));

  return isExpression ? "활용 예문" : "예시 문장";
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

async function loadManifestEntry(entry, loadFile) {
  try {
    return await loadFile(entry.path, { optional: entry.optional ?? false });
  } catch (error) {
    if (entry.optional) {
      return null;
    }

    throw error;
  }
}

export async function loadDictionaryData({ files, loadFile }) {
  const { base, supplemental, textbookExpressions, exampleSentences } = files;
  const [baseDictionary, supplementalDictionary, textbookExpressionsDictionary, examplePayload] =
    await Promise.all([
      loadManifestEntry(base, loadFile),
      loadManifestEntry(supplemental, loadFile),
      loadManifestEntry(textbookExpressions, loadFile),
      loadManifestEntry(exampleSentences, loadFile)
    ]);

  const mergedDictionary = [baseDictionary, supplementalDictionary, textbookExpressionsDictionary]
    .filter(Boolean)
    .reduce((merged, current) => mergeDictionaries(merged, current));

  return mergeExampleSentences(mergedDictionary, examplePayload);
}

export function scoreMatch(word, englishQuery, koreanQuery) {
  if (!englishQuery && !koreanQuery) {
    return 0;
  }

  const englishKeywords = word.searchKeywords.english.map(normalizeEnglish);
  const koreanKeywords = word.searchKeywords.korean.map(normalizeKorean);

  if (normalizeEnglish(word.word) === englishQuery) {
    return SCORE.primaryExact;
  }

  if (englishKeywords.some((value) => value === englishQuery)) {
    return SCORE.englishExact;
  }

  if (koreanKeywords.some((value) => value === koreanQuery)) {
    return SCORE.koreanExact;
  }

  if (englishKeywords.some((value) => value.startsWith(englishQuery))) {
    return SCORE.englishPrefix;
  }

  if (koreanKeywords.some((value) => value.startsWith(koreanQuery))) {
    return SCORE.koreanPrefix;
  }

  if (englishKeywords.some((value) => value.includes(englishQuery))) {
    return SCORE.englishContains;
  }

  if (koreanKeywords.some((value) => value.includes(koreanQuery))) {
    return SCORE.koreanContains;
  }

  return 0;
}

export function searchWords({ words, rawQuery, category, offset = 0, limit = RESULT_LIMIT }) {
  const englishQuery = normalizeEnglish(rawQuery.trim());
  const koreanQuery = normalizeKorean(rawQuery.trim());

  let visibleWords = words;

  if (category !== "all") {
    visibleWords = visibleWords.filter((word) => word.category === category);
  }

  if (!rawQuery.trim()) {
    const rankedWords = [...visibleWords].sort((left, right) => left.id - right.id);

    return {
      items: rankedWords.slice(offset, offset + limit),
      total: rankedWords.length,
      shown: Math.min(offset + limit, rankedWords.length),
      hasMore: offset + limit < rankedWords.length
    };
  }

  const rankedWords = visibleWords
    .map((word) => ({
      word,
      score: scoreMatch(word, englishQuery, koreanQuery)
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.word.id - right.word.id)
    .map((item) => item.word);

  return {
    items: rankedWords.slice(offset, offset + limit),
    total: rankedWords.length,
    shown: Math.min(offset + limit, rankedWords.length),
    hasMore: offset + limit < rankedWords.length
  };
}

export function filterWords({ words, rawQuery, category, limit = RESULT_LIMIT }) {
  return searchWords({ words, rawQuery, category, offset: 0, limit }).items;
}
