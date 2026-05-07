import fs from "node:fs";
import path from "node:path";
import { normalizeEnglish, normalizeKorean } from "../lib/dictionary-logic.js";

const DATA_DIR = "data";

const DATASET_CONFIG = {
  base: {
    filename: "words.json",
    label: "base",
    required: true,
    allowedCategories: new Set(["elementary", "middle", "high"])
  },
  supplemental: {
    filename: "supplemental-words.json",
    label: "supplemental",
    required: false,
    allowedCategories: new Set(["supplemental"])
  },
  textbookExpressions: {
    filename: "textbook-expressions.json",
    label: "textbook-expressions",
    required: false,
    allowedCategories: new Set(["elementary-expressions", "middle-expressions"])
  },
  exampleSentences: {
    filename: "example-sentences.json",
    label: "example-sentences",
    required: false
  }
};

const MERGED_CATEGORY_KEYS = new Set([
  ...DATASET_CONFIG.base.allowedCategories,
  ...DATASET_CONFIG.supplemental.allowedCategories,
  ...DATASET_CONFIG.textbookExpressions.allowedCategories
]);
const REQUIRED_BASE_DERIVED_STAT_KEYS = ["dictUnmatched", "missingGlosses"];

export const DEFAULT_EXPECTED_STATS = {
  base: {
    total: 3000,
    elementary: 800,
    middle: 1200,
    high: 1000
  }
};

export const DEFAULT_EXAMPLE_COVERAGE_THRESHOLDS = {
  base: 1.0,
  supplemental: 0.5,
  textbookExpressions: 0
};

function normalizeMode(mode = "strict") {
  if (mode === "strict" || mode === "partial") {
    return mode;
  }

  throw new Error(`Unknown validation mode: ${mode}`);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function isStringArray(value, { allowEmpty = true } = {}) {
  return (
    Array.isArray(value) &&
    (allowEmpty || value.length > 0) &&
    value.every((item) => typeof item === "string" && item.trim().length > 0)
  );
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function countWordsByCategory(words) {
  return words.reduce((counts, word) => {
    const category = isPlainObject(word) ? word.category : undefined;

    if (typeof category === "string" && category.length > 0) {
      counts[category] = (counts[category] ?? 0) + 1;
    }

    return counts;
  }, {});
}

function getWordEntryId(entry, index) {
  return isPlainObject(entry) && Object.prototype.hasOwnProperty.call(entry, "id") ? entry.id : `#${index + 1}`;
}

function buildNormalizedTokenSet(values, normalize) {
  if (!Array.isArray(values)) {
    return new Set();
  }

  return new Set(
    values
      .filter((value) => typeof value === "string")
      .map((value) => normalize(value))
      .filter(Boolean)
  );
}

function collectKoreanKeywordSources(word) {
  const sources = [];

  const addSource = (value) => {
    if (typeof value !== "string") {
      return;
    }

    const normalized = normalizeKorean(value);
    if (normalized) {
      sources.push(normalized);
    }

    for (const token of value.split(",")) {
      const tokenNormalized = normalizeKorean(token);
      if (tokenNormalized) {
        sources.push(tokenNormalized);
      }
    }
  };

  for (const gloss of word.koreanGlosses ?? []) {
    addSource(gloss);
  }

  for (const definition of word.koreanDefinitions ?? []) {
    addSource(definition);
  }

  return new Set(sources);
}

function validateMergedSearchKeywordsInvariant(word, entryId, errors, { label }) {
  const englishKeywords = buildNormalizedTokenSet(word.searchKeywords?.english, (value) =>
    normalizeEnglish(String(value))
  );
  const requiredEnglishTerms = buildNormalizedTokenSet([word.word, ...(word.forms ?? [])], (value) =>
    normalizeEnglish(String(value))
  );

  for (const term of requiredEnglishTerms) {
    if (!englishKeywords.has(term)) {
      errors.push(`${label}: entry ${entryId} searchKeywords.english must include normalized word and each form`);
      break;
    }
  }

  const koreanSources = collectKoreanKeywordSources(word);
  const koreanKeywords = buildNormalizedTokenSet(word.searchKeywords?.korean, (value) =>
    normalizeKorean(String(value))
  );
  const hasMatchedKorean = [...koreanSources].some((source) => koreanKeywords.has(source));

  if (!hasMatchedKorean) {
    errors.push(
      `${label}: entry ${entryId} searchKeywords.korean must include at least one normalized Korean gloss or definition`
    );
  }
}

function validateDictionaryPayload(payload, label, errors) {
  if (!isPlainObject(payload)) {
    errors.push(`${label} payload must be an object`);
    return;
  }

  if (!isPlainObject(payload.stats)) {
    errors.push(`${label} stats must be an object`);
  }

  if (!Array.isArray(payload.words)) {
    errors.push(`${label} words must be an array`);
  }
}

function validateExamplePayloadStructure(payload, errors) {
  if (!isPlainObject(payload)) {
    errors.push("example-sentences payload must be an object");
    return;
  }

  if (!isPlainObject(payload.stats)) {
    errors.push("example-sentences stats must be an object");
  }

  if (!Array.isArray(payload.items)) {
    errors.push("example-sentences items must be an array");
  }
}

function validateWordEntries(
  words,
  label,
  errors,
  { allowedCategories, requireExampleSentence = false, checkSearchKeywords = false } = {}
) {
  if (!Array.isArray(words)) {
    return;
  }

  for (const [index, word] of words.entries()) {
    const entryId = getWordEntryId(word, index);

    if (!isPlainObject(word)) {
      errors.push(`${label}: entry ${entryId} must be an object`);
      continue;
    }

    if (!isPositiveInteger(word.id)) {
      errors.push(`${label}: entry ${entryId} id must be a positive integer`);
    }

    if (typeof word.word !== "string" || word.word.trim().length === 0) {
      errors.push(`${label}: entry ${entryId} word must be a non-empty string`);
    }

    if (!isStringArray(word.forms, { allowEmpty: false })) {
      errors.push(`${label}: entry ${entryId} forms must be a non-empty array of strings`);
    }

    if (typeof word.category !== "string" || word.category.trim().length === 0) {
      errors.push(`${label}: entry ${entryId} category must be a non-empty string`);
    } else if (allowedCategories && !allowedCategories.has(word.category)) {
      errors.push(
        `${label}: entry ${entryId} category must be one of ${Array.from(allowedCategories).join(", ")}`
      );
    }

    if (typeof word.categoryLabel !== "string" || word.categoryLabel.trim().length === 0) {
      errors.push(`${label}: entry ${entryId} categoryLabel must be a non-empty string`);
    }

    if (typeof word.categoryDescription !== "string" || word.categoryDescription.trim().length === 0) {
      errors.push(`${label}: entry ${entryId} categoryDescription must be a non-empty string`);
    }

    if (typeof word.pronunciationIpa !== "string") {
      errors.push(`${label}: entry ${entryId} pronunciationIpa must be a string`);
    }

    if (!isStringArray(word.koreanGlosses, { allowEmpty: false })) {
      errors.push(`${label}: entry ${entryId} koreanGlosses must be a non-empty array of strings`);
    }

    if (!isStringArray(word.koreanDefinitions, { allowEmpty: false })) {
      errors.push(`${label}: entry ${entryId} koreanDefinitions must be a non-empty array of strings`);
    }

    if (!isStringArray(word.englishHints)) {
      errors.push(`${label}: entry ${entryId} englishHints must be an array of strings`);
    }

    if (!isStringArray(word.matchedDictionaryForms)) {
      errors.push(`${label}: entry ${entryId} matchedDictionaryForms must be an array of strings`);
    }

    if (!isPlainObject(word.searchKeywords)) {
      errors.push(`${label}: entry ${entryId} searchKeywords must be an object`);
    } else {
      if (!isStringArray(word.searchKeywords.english)) {
        errors.push(`${label}: entry ${entryId} searchKeywords.english must be an array of strings`);
      }

      if (!isStringArray(word.searchKeywords.korean)) {
        errors.push(`${label}: entry ${entryId} searchKeywords.korean must be an array of strings`);
      }

      if (checkSearchKeywords && label === "merged") {
        validateMergedSearchKeywordsInvariant(
          word,
          entryId,
          errors,
          { label: "merged" }
        );
      }
    }

    if (
      Object.prototype.hasOwnProperty.call(word, "speakText") &&
      typeof word.speakText !== "string"
    ) {
      errors.push(`${label}: entry ${entryId} speakText must be a string when present`);
    }

    if (requireExampleSentence && typeof word.exampleSentence !== "string") {
      errors.push(`${label}: entry ${entryId} exampleSentence must be a string`);
    }
  }
}

function validateStats(stats, errors, label, actualCounts, allowedCategories = new Set()) {
  if (!isPlainObject(stats)) {
    return;
  }

  const total = Object.values(actualCounts).reduce((sum, count) => sum + count, 0);

  if (stats.total !== total) {
    errors.push(`${label} stats.total expected ${total}, got ${stats.total}`);
  }

  const categoriesToCheck = new Set([
    ...Object.keys(actualCounts),
    ...Object.keys(stats).filter((key) => allowedCategories.has(key))
  ]);

  for (const category of categoriesToCheck) {
    const expected = actualCounts[category] ?? 0;

    if (stats[category] !== expected) {
      errors.push(`${label} stats.${category} expected ${expected}, got ${stats[category]}`);
    }
  }
}

function countBaseDerivedStats(words) {
  return (Array.isArray(words) ? words : []).reduce(
    (counts, word) => {
      if (!isPlainObject(word)) {
        return counts;
      }

      if (Array.isArray(word.matchedDictionaryForms) && word.matchedDictionaryForms.length === 0) {
        counts.dictUnmatched += 1;
      }

      if (Array.isArray(word.koreanGlosses) && word.koreanGlosses.length === 0) {
        counts.missingGlosses += 1;
      }

      return counts;
    },
    { dictUnmatched: 0, missingGlosses: 0 }
  );
}

function validateBaseDerivedStats(stats, words, errors) {
  if (!isPlainObject(stats)) {
    return;
  }

  const actualDerivedStats = countBaseDerivedStats(words);

  for (const key of REQUIRED_BASE_DERIVED_STAT_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(stats, key)) {
      errors.push(`base stats.${key} is required`);
      continue;
    }

    if (stats[key] !== actualDerivedStats[key]) {
      errors.push(`base stats.${key} expected ${actualDerivedStats[key]}, got ${stats[key]}`);
    }
  }
}

function buildExampleLookup(exampleSentences) {
  if (!exampleSentences || !Array.isArray(exampleSentences.items)) {
    return new Map();
  }

  const exampleMap = new Map();

  for (const item of exampleSentences.items) {
    if (!isPositiveInteger(item?.id)) {
      continue;
    }

    if (typeof item.exampleSentence === "string" && item.exampleSentence.trim().length > 0) {
      exampleMap.set(item.id, true);
    }
  }

  return exampleMap;
}

function buildExampleCoverageForDataset(words, exampleLookup) {
  const datasetWords = Array.isArray(words) ? words : [];
  const total = datasetWords.length;

  if (total === 0) {
    return { covered: 0, total: 0, ratio: 0 };
  }

  const covered = datasetWords.reduce((count, word) => {
    if (!isPositiveInteger(word?.id)) {
      return count;
    }

    return count + (exampleLookup.has(word.id) ? 1 : 0);
  }, 0);

  return {
    covered,
    total,
    ratio: covered / total
  };
}

function buildExampleCoverage({ base, supplemental, textbookExpressions, exampleSentences }) {
  const exampleLookup = buildExampleLookup(exampleSentences);

  return {
    base: buildExampleCoverageForDataset(base?.words, exampleLookup),
    supplemental: buildExampleCoverageForDataset(supplemental?.words, exampleLookup),
    textbookExpressions: buildExampleCoverageForDataset(textbookExpressions?.words, exampleLookup)
  };
}

function normalizeExampleCoverageThresholds(overrides = {}) {
  const thresholds = { ...DEFAULT_EXAMPLE_COVERAGE_THRESHOLDS };

  if (!isPlainObject(overrides)) {
    return thresholds;
  }

  for (const [key, value] of Object.entries(overrides)) {
    if (typeof value === "number") {
      thresholds[key] = Math.max(0, Math.min(1, value));
    }
  }

  return thresholds;
}

function validateExampleCoverage(exampleCoverage, thresholds, errors) {
  for (const [key, threshold] of Object.entries(thresholds)) {
    const coverage = exampleCoverage[key];

    if (!coverage) {
      continue;
    }

    if (coverage.total > 0 ? coverage.ratio + 1e-12 >= threshold : threshold === 0) {
      continue;
    }

    errors.push(
      `${key} example coverage ratio ${(coverage.ratio * 100).toFixed(1)}% is below threshold ${(threshold * 100).toFixed(
        1
      )}%`
    );
  }
}

function buildMergedWords({ base, supplemental, textbookExpressions, exampleSentences }) {
  const baseWords = Array.isArray(base?.words) ? base.words : [];
  const supplementalWords = Array.isArray(supplemental?.words) ? supplemental.words : [];
  const textbookExpressionWords = Array.isArray(textbookExpressions?.words) ? textbookExpressions.words : [];
  const mergedWords = [...baseWords, ...supplementalWords, ...textbookExpressionWords];

  if (!exampleSentences || !Array.isArray(exampleSentences.items)) {
    return mergedWords;
  }

  const exampleMap = new Map(exampleSentences.items.map((item) => [item?.id, item?.exampleSentence]));

  return mergedWords.map((word) => ({
    ...word,
    exampleSentence: exampleMap.get(word.id) ?? ""
  }));
}

function validateExamplePayload(examplePayload, knownWordCategoriesById, errors) {
  validateExamplePayloadStructure(examplePayload, errors);

  if (!isPlainObject(examplePayload) || !Array.isArray(examplePayload.items)) {
    return;
  }

  const seenIds = new Set();
  const categoryCounts = {};

  for (const [index, item] of examplePayload.items.entries()) {
    const entryId = getWordEntryId(item, index);

    if (!isPlainObject(item)) {
      errors.push(`example-sentences: item ${entryId} must be an object`);
      continue;
    }

    if (!isPositiveInteger(item.id)) {
      errors.push(`example-sentences: item ${entryId} id must be a positive integer`);
      continue;
    }

    if (seenIds.has(item.id)) {
      errors.push(`example-sentences: duplicate example id ${item.id}`);
    } else {
      seenIds.add(item.id);
    }

    if (typeof item.exampleSentence !== "string" || item.exampleSentence.trim().length === 0) {
      errors.push(`example-sentences: item ${item.id} exampleSentence must be a non-empty string`);
    }

    const category = knownWordCategoriesById.get(item.id);

    if (!category) {
      errors.push(`example-sentences: item ${item.id} does not reference any known word id`);
      continue;
    }

    categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;
  }

  validateStats(examplePayload.stats, errors, "example-sentences", categoryCounts, MERGED_CATEGORY_KEYS);
}

function summarizeDataSet({ base, supplemental, textbookExpressions, exampleSentences, exampleCoverage = null }) {
  return {
    base: base?.stats ?? null,
    supplemental: supplemental?.stats ?? null,
    textbookExpressions: textbookExpressions?.stats ?? null,
    exampleSentences: exampleSentences?.stats ?? null,
    exampleCoverage: exampleCoverage ?? buildExampleCoverage({ base, supplemental, textbookExpressions, exampleSentences }),
    mergedTotal:
      (base?.stats?.total ?? 0) +
      (supplemental?.stats?.total ?? 0) +
      (textbookExpressions?.stats?.total ?? 0)
  };
}

function validateExpectedStats(stats, expectedStats, errors, label) {
  if (!expectedStats || !isPlainObject(stats)) {
    return;
  }

  for (const [key, expected] of Object.entries(expectedStats)) {
    if (stats[key] !== expected) {
      errors.push(`${label} stats.${key} expected committed value ${expected}, got ${stats[key]}`);
    }
  }
}

export function loadRepositoryData({ rootDir = process.cwd(), mode = "strict" } = {}) {
  const normalizedMode = normalizeMode(mode);
  const result = { mode: normalizedMode };

  for (const [key, config] of Object.entries(DATASET_CONFIG)) {
    const filePath = path.join(rootDir, DATA_DIR, config.filename);

    if (!fs.existsSync(filePath)) {
      if (config.required || normalizedMode === "strict") {
        throw new Error(`Missing required data file: ${filePath}`);
      }

      result[key] = null;
      continue;
    }

    result[key] = loadJson(filePath);
  }

  return result;
}

export function validateDataSet(dataSet, options = {}) {
  const mode = normalizeMode(dataSet?.mode ?? "strict");
  const expectedStats = options.expectedStats ?? {};
  const exampleCoverageThresholds = normalizeExampleCoverageThresholds(options.exampleCoverageThresholds ?? {});
  const errors = [];
  const base = dataSet?.base ?? null;
  const supplemental = dataSet?.supplemental ?? null;
  const textbookExpressions = dataSet?.textbookExpressions ?? null;
  const exampleSentences = dataSet?.exampleSentences ?? null;

  if (!base) {
    errors.push("base dataset is required");
  }

  if (mode === "strict") {
    if (!supplemental) {
      errors.push("supplemental dataset is required in strict mode");
    }

    if (!textbookExpressions) {
      errors.push("textbook-expressions dataset is required in strict mode");
    }

    if (!exampleSentences) {
      errors.push("example-sentences dataset is required in strict mode");
    }
  }

  if (base) {
    validateDictionaryPayload(base, "base", errors);
    validateWordEntries(base.words, "base", errors, {
      allowedCategories: DATASET_CONFIG.base.allowedCategories
    });
    validateStats(base.stats, errors, "base", countWordsByCategory(base.words ?? []), DATASET_CONFIG.base.allowedCategories);
    validateBaseDerivedStats(base.stats, base.words, errors);
    validateExpectedStats(base.stats, expectedStats.base, errors, "base");
  }

  if (supplemental) {
    validateDictionaryPayload(supplemental, "supplemental", errors);
    validateWordEntries(supplemental.words, "supplemental", errors, {
      allowedCategories: DATASET_CONFIG.supplemental.allowedCategories
    });
    validateStats(
      supplemental.stats,
      errors,
      "supplemental",
      countWordsByCategory(supplemental.words ?? []),
      DATASET_CONFIG.supplemental.allowedCategories
    );
    validateExpectedStats(supplemental.stats, expectedStats.supplemental, errors, "supplemental");
  }

  if (textbookExpressions) {
    validateDictionaryPayload(textbookExpressions, "textbook-expressions", errors);
    validateWordEntries(textbookExpressions.words, "textbook-expressions", errors, {
      allowedCategories: DATASET_CONFIG.textbookExpressions.allowedCategories
    });
    validateStats(
      textbookExpressions.stats,
      errors,
      "textbook-expressions",
      countWordsByCategory(textbookExpressions.words ?? []),
      DATASET_CONFIG.textbookExpressions.allowedCategories
    );
    validateExpectedStats(
      textbookExpressions.stats,
      expectedStats.textbookExpressions,
      errors,
      "textbook-expressions"
    );
  }

  const mergedWords = buildMergedWords({ base, supplemental, textbookExpressions, exampleSentences });
  const knownWordCategoriesById = new Map();
  const seenWordIds = new Set();

  for (const [index, word] of mergedWords.entries()) {
    if (!isPlainObject(word) || !isPositiveInteger(word.id)) {
      continue;
    }

    if (seenWordIds.has(word.id)) {
      errors.push(`merged: duplicate word id ${word.id}`);
    } else {
      seenWordIds.add(word.id);
      if (typeof word.category === "string") {
        knownWordCategoriesById.set(word.id, word.category);
      }
    }
  }

  validateWordEntries(mergedWords, "merged", errors, {
    allowedCategories: MERGED_CATEGORY_KEYS,
    requireExampleSentence: Boolean(exampleSentences),
    checkSearchKeywords: true
  });

  const exampleCoverage = buildExampleCoverage({
    base,
    supplemental,
    textbookExpressions,
    exampleSentences
  });

  if (exampleSentences) {
    validateExamplePayload(exampleSentences, knownWordCategoriesById, errors);
    validateExpectedStats(exampleSentences.stats, expectedStats.exampleSentences, errors, "example-sentences");
  }

  if (mode === "strict") {
    validateExampleCoverage(exampleCoverage, exampleCoverageThresholds, errors);
  }

  return {
    ok: errors.length === 0,
    errors,
    summary: summarizeDataSet({
      base,
      supplemental,
      textbookExpressions,
      exampleSentences,
      exampleCoverage
    })
  };
}
