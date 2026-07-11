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
  const hasDictionaryContribution =
    extraDictionary &&
    (extraDictionary.words.length > 0 ||
      Object.keys(extraDictionary.stats ?? {}).length > 0 ||
      (extraDictionary.sources?.length ?? 0) > 0 ||
      extraDictionary.generatedAt !== undefined);

  if (!hasDictionaryContribution) {
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
  if (!examplePayload || examplePayload.items.length === 0) {
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

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function hasRuntimeWordShape(word) {
  return (
    isRecord(word) &&
    Number.isInteger(word.id) &&
    word.id > 0 &&
    typeof word.word === "string" &&
    word.word.trim().length > 0 &&
    isStringArray(word.forms) &&
    word.forms.length > 0 &&
    typeof word.category === "string" &&
    word.category.trim().length > 0 &&
    typeof word.categoryLabel === "string" &&
    word.categoryLabel.trim().length > 0 &&
    typeof word.pronunciationIpa === "string" &&
    isStringArray(word.koreanGlosses) &&
    isStringArray(word.koreanDefinitions) &&
    isRecord(word.searchKeywords) &&
    isStringArray(word.searchKeywords.english) &&
    isStringArray(word.searchKeywords.korean) &&
    (!Object.hasOwn(word, "speakText") || typeof word.speakText === "string")
  );
}

function assertDictionaryPayload(payload, path) {
  if (
    !isRecord(payload) ||
    !isRecord(payload.stats) ||
    !Array.isArray(payload.words) ||
    (payload.sources !== undefined && !Array.isArray(payload.sources)) ||
    !payload.words.every(hasRuntimeWordShape)
  ) {
    throw new Error(`Invalid dictionary payload at ${path}.`);
  }

  return payload;
}

function assertExamplePayload(payload, path) {
  if (
    !isRecord(payload) ||
    !Array.isArray(payload.items) ||
    !payload.items.every(
      (item) =>
        isRecord(item) &&
        Number.isInteger(item.id) &&
        item.id > 0 &&
        typeof item.exampleSentence === "string"
    )
  ) {
    throw new Error(`Invalid example payload at ${path}.`);
  }

  return payload;
}

function reportOptionalError(entry, error, onOptionalError) {
  try {
    onOptionalError?.({ path: entry.path, error });
  } catch {
    // A telemetry callback must not make optional data fatal.
  }
}

async function loadManifestEntry(entry, loadFile, onOptionalError, validatePayload) {
  try {
    const payload = await loadFile(entry.path, { optional: entry.optional ?? false });

    if (payload === null || payload === undefined) {
      throw new Error(`No data returned for ${entry.path}.`);
    }

    return validatePayload(payload, entry.path);
  } catch (error) {
    if (!entry.optional) {
      throw error;
    }

    reportOptionalError(entry, error, onOptionalError);
    return null;
  }
}

function applyOptionalPayload(dictionary, entry, payload, applyPayload, onOptionalError) {
  if (!payload) {
    return dictionary;
  }

  try {
    return applyPayload(dictionary, payload);
  } catch (error) {
    reportOptionalError(entry, error, onOptionalError);
    return dictionary;
  }
}

export async function loadDictionaryData({ files, loadFile, onOptionalError }) {
  const { base, supplemental, textbookExpressions, exampleSentences } = files;
  const [baseDictionary, supplementalDictionary, textbookExpressionsDictionary, examplePayload] =
    await Promise.all([
      loadManifestEntry(base, loadFile, onOptionalError, assertDictionaryPayload),
      loadManifestEntry(supplemental, loadFile, onOptionalError, assertDictionaryPayload),
      loadManifestEntry(textbookExpressions, loadFile, onOptionalError, assertDictionaryPayload),
      loadManifestEntry(exampleSentences, loadFile, onOptionalError, assertExamplePayload)
    ]);

  const dictionaryWithSupplemental = applyOptionalPayload(
    baseDictionary,
    supplemental,
    supplementalDictionary,
    mergeDictionaries,
    onOptionalError
  );
  const dictionaryWithExpressions = applyOptionalPayload(
    dictionaryWithSupplemental,
    textbookExpressions,
    textbookExpressionsDictionary,
    mergeDictionaries,
    onOptionalError
  );

  return applyOptionalPayload(
    dictionaryWithExpressions,
    exampleSentences,
    examplePayload,
    mergeExampleSentences,
    onOptionalError
  );
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
