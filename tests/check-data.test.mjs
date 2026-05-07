import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { loadRepositoryData, validateDataSet } from "../scripts/data-validation.mjs";

function createWord(overrides = {}) {
  const id = overrides.id ?? 1;
  const word = overrides.word ?? `word-${id}`;

  return {
    id,
    word,
    forms: overrides.forms ?? [word],
    category: overrides.category ?? "elementary",
    categoryLabel: overrides.categoryLabel ?? "Elementary",
    categoryDescription: overrides.categoryDescription ?? "Elementary words",
    pronunciationIpa: overrides.pronunciationIpa ?? "",
    koreanGlosses: overrides.koreanGlosses ?? ["뜻"],
    koreanDefinitions: overrides.koreanDefinitions ?? ["뜻"],
    englishHints: overrides.englishHints ?? [],
    matchedDictionaryForms: overrides.matchedDictionaryForms ?? [],
    searchKeywords: overrides.searchKeywords ?? {
      english: [word.toLowerCase()],
      korean: ["뜻"]
    },
    ...(Object.prototype.hasOwnProperty.call(overrides, "speakText")
      ? { speakText: overrides.speakText }
      : {})
  };
}

function createDictionary(words, stats) {
  return {
    stats,
    words
  };
}

function createExamplePayload(items, stats) {
  return {
    stats,
    items
  };
}

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
}

test("strict mode requires committed supporting datasets to exist", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "check-data-strict-"));
  const baseWords = [
    createWord({ id: 1, category: "elementary" }),
    createWord({ id: 2, category: "middle" }),
    createWord({ id: 3, category: "high" })
  ];

  writeJson(
    path.join(tempRoot, "data", "words.json"),
    createDictionary(baseWords, {
      total: 3000,
      elementary: 800,
      middle: 1200,
      high: 1000
    })
  );

  assert.throws(
    () => loadRepositoryData({ rootDir: tempRoot, mode: "strict" }),
    /Missing required data file/
  );
});

test("partial mode allows missing supporting datasets", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "check-data-partial-"));
  const baseWords = [
    createWord({ id: 1, category: "elementary" }),
    createWord({ id: 2, category: "middle" }),
    createWord({ id: 3, category: "high" })
  ];

  writeJson(
    path.join(tempRoot, "data", "words.json"),
    createDictionary(baseWords, {
      total: 3000,
      elementary: 800,
      middle: 1200,
      high: 1000
    })
  );

  const dataset = loadRepositoryData({ rootDir: tempRoot, mode: "partial" });

  assert.equal(dataset.mode, "partial");
  assert.equal(dataset.base.words.length, 3);
  assert.equal(dataset.supplemental, null);
  assert.equal(dataset.textbookExpressions, null);
  assert.equal(dataset.exampleSentences, null);
});

test("validateDataSet reports merged word shape, id integrity, and example join issues", () => {
  const result = validateDataSet({
    mode: "strict",
    base: createDictionary(
      [
        createWord({ id: 1, category: "elementary", forms: "not-an-array" }),
        createWord({ id: 1, category: "middle", searchKeywords: { english: [], korean: "뜻" } })
      ],
      { total: 3000, elementary: 800, middle: 1200, high: 1000 }
    ),
    supplemental: createDictionary(
      [createWord({ id: 3001, category: "supplemental", speakText: 123 })],
      { total: 1, supplemental: 1 }
    ),
    textbookExpressions: createDictionary(
      [createWord({ id: 3408, category: "elementary-expressions", speakText: "Hello" })],
      { total: 1, "elementary-expressions": 1 }
    ),
    exampleSentences: createExamplePayload(
      [
        { id: 1, exampleSentence: 123 },
        { id: 9999, exampleSentence: "missing reference" },
        { id: 9999, exampleSentence: "duplicate reference" }
      ],
      { total: 3, elementary: 1, supplemental: 2 }
    )
  });

  assert.equal(result.ok, false);
  assert(result.errors.some((error) => error.includes("base: entry 1 forms must be a non-empty array")));
  assert(result.errors.some((error) => error.includes("duplicate word id 1")));
  assert(result.errors.some((error) => error.includes("base: entry 1 searchKeywords.korean must be an array of strings")));
  assert(result.errors.some((error) => error.includes("supplemental: entry 3001 speakText must be a string when present")));
  assert(result.errors.some((error) => error.includes("example-sentences: duplicate example id 9999")));
  assert(result.errors.some((error) => error.includes("example-sentences: item 9999 does not reference any known word id")));
  assert(result.errors.some((error) => error.includes("merged: entry 1 exampleSentence must be a string")));
});

test("validateDataSet checks stats against actual contents without requiring full example coverage", () => {
  const baseWords = [
    createWord({ id: 1, category: "elementary" }),
    createWord({ id: 2, category: "middle" }),
    createWord({ id: 3, category: "high" })
  ];
  const supplementalWords = [createWord({ id: 3001, category: "supplemental", speakText: "use up" })];
  const expressionWords = [createWord({ id: 3408, category: "elementary-expressions", speakText: "Hello" })];

  const result = validateDataSet({
    mode: "strict",
    base: createDictionary(baseWords, {
      total: 2,
      elementary: 2,
      middle: 1,
      high: 1
    }),
    supplemental: createDictionary(supplementalWords, {
      total: 2,
      supplemental: 1
    }),
    textbookExpressions: createDictionary(expressionWords, {
      total: 1,
      "elementary-expressions": 2
    }),
    exampleSentences: createExamplePayload(
      [
        { id: 1, exampleSentence: "base example" },
        { id: 3001, exampleSentence: "supplemental example" }
      ],
      {
        total: 3,
        elementary: 1,
        supplemental: 2
      }
    )
  });

  assert.equal(result.ok, false);
  assert(result.errors.some((error) => error.includes("base stats.total expected 3, got 2")));
  assert(result.errors.some((error) => error.includes("base stats.elementary expected 1, got 2")));
  assert(result.errors.some((error) => error.includes("supplemental stats.total expected 1, got 2")));
  assert(
    result.errors.some((error) =>
      error.includes("textbook-expressions stats.elementary-expressions expected 1, got 2")
    )
  );
  assert(result.errors.some((error) => error.includes("example-sentences stats.total expected 2, got 3")));
  assert(result.errors.some((error) => error.includes("example-sentences stats.supplemental expected 1, got 2")));
});

test("validateDataSet enforces search keyword invariants on merged words", () => {
  const result = validateDataSet({
    mode: "strict",
    base: createDictionary(
      [
        createWord({
          id: 1,
          category: "elementary",
          word: "run",
          forms: ["run", "jog"],
          searchKeywords: {
            english: ["run"],
            korean: ["달리다"]
          }
        })
      ],
      {
        total: 1,
        elementary: 1,
        middle: 0,
        high: 0,
        dictUnmatched: 1,
        missingGlosses: 0
      }
    ),
    supplemental: createDictionary([], {
      total: 0,
      supplemental: 0
    }),
    textbookExpressions: createDictionary([], {
      total: 0,
      "elementary-expressions": 0,
      "middle-expressions": 0
    }),
    exampleSentences: createExamplePayload(
      [{ id: 1, exampleSentence: "I run every day." }],
      { total: 1, elementary: 1 }
    )
  });

  assert.equal(result.ok, false);
  assert(
    result.errors.some((error) =>
      error.includes("merged: entry 1 searchKeywords.english must include normalized word and each form")
    )
  );
  assert(
    result.errors.some((error) =>
      error.includes("merged: entry 1 searchKeywords.korean must include at least one normalized Korean gloss or definition")
    )
  );
});

test("validateDataSet applies default strict example coverage thresholds", () => {
  const baseWords = [
    createWord({ id: 1, category: "elementary" }),
    createWord({ id: 2, category: "middle" }),
    createWord({ id: 3, category: "high" })
  ];
  const supplementalWords = [
    createWord({ id: 3001, category: "supplemental", speakText: "run up" }),
    createWord({ id: 3002, category: "supplemental", speakText: "run out" })
  ];
  const expressionWords = [
    createWord({ id: 3408, category: "elementary-expressions", speakText: "Good morning" })
  ];

  const result = validateDataSet({
    mode: "strict",
    base: createDictionary(baseWords, {
      total: 3,
      elementary: 1,
      middle: 1,
      high: 1,
      dictUnmatched: 3,
      missingGlosses: 0
    }),
    supplemental: createDictionary(supplementalWords, {
      total: 2,
      supplemental: 2
    }),
    textbookExpressions: createDictionary(expressionWords, {
      total: 1,
      "elementary-expressions": 1
    }),
    exampleSentences: createExamplePayload(
      [
        { id: 1, exampleSentence: "base example" },
        { id: 2, exampleSentence: "base example" },
        { id: 3, exampleSentence: "base example" },
        { id: 3001, exampleSentence: "supplemental example" }
      ],
      {
        total: 4,
        elementary: 1,
        middle: 1,
        high: 1,
        supplemental: 1
      }
    )
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
  assert.equal(result.summary.exampleCoverage.base.ratio, 1);
  assert.equal(result.summary.exampleCoverage.supplemental.ratio, 0.5);
  assert.equal(result.summary.exampleCoverage.textbookExpressions.ratio, 0);
});

test("validateDataSet does not enforce example coverage in partial mode when optional files are missing", () => {
  const result = validateDataSet({
    mode: "partial",
    base: createDictionary(
      [createWord({ id: 1, category: "elementary", matchedDictionaryForms: [] })],
      {
        total: 1,
        elementary: 1,
        middle: 0,
        high: 0,
        dictUnmatched: 1,
        missingGlosses: 0
      }
    ),
    supplemental: null,
    textbookExpressions: null,
    exampleSentences: null
  });

  assert.equal(result.ok, true);
  assert.equal(result.summary.exampleCoverage.base.total, 1);
  assert.equal(result.summary.exampleCoverage.base.covered, 0);
  assert.equal(result.summary.exampleCoverage.base.ratio, 0);
  assert.equal(result.summary.exampleCoverage.supplemental.total, 0);
});

test("validateDataSet rejects strict example coverage misses", () => {
  const result = validateDataSet({
    mode: "strict",
    base: createDictionary(
      [createWord({ id: 1, category: "elementary" }), createWord({ id: 2, category: "middle" })],
      {
        total: 2,
        elementary: 1,
        middle: 1,
        high: 0,
        dictUnmatched: 2,
        missingGlosses: 0
      }
    ),
    supplemental: createDictionary([], {
      total: 0,
      supplemental: 0
    }),
    textbookExpressions: createDictionary([], {
      total: 0,
      "elementary-expressions": 0,
      "middle-expressions": 0
    }),
    exampleSentences: createExamplePayload(
      [{ id: 1, exampleSentence: "base example" }],
      {
        total: 1,
        elementary: 1
      }
    )
  });

  assert.equal(result.ok, false);
  assert(result.errors.some((error) => error.includes("base example coverage ratio")));
  assert(result.errors.some((error) => error.includes("below threshold 100.0%")));
});

test("validateDataSet checks base derived stats fields against actual payload contents", () => {
  const baseWords = [
    createWord({ id: 1, category: "elementary", matchedDictionaryForms: ["word-1"] }),
    createWord({ id: 2, category: "middle" }),
    createWord({ id: 3, category: "high", matchedDictionaryForms: ["word-3"] })
  ];

  const result = validateDataSet({
    mode: "partial",
    base: createDictionary(baseWords, {
      total: 3,
      elementary: 1,
      middle: 1,
      high: 1,
      dictUnmatched: 0,
      missingGlosses: 2
    }),
    supplemental: null,
    textbookExpressions: null,
    exampleSentences: null
  });

  assert.equal(result.ok, false);
  assert(result.errors.some((error) => error.includes("base stats.dictUnmatched expected 1, got 0")));
  assert(result.errors.some((error) => error.includes("base stats.missingGlosses expected 0, got 2")));
});

test("validateDataSet requires committed base derived stats keys to be present", () => {
  const baseWords = [
    createWord({ id: 1, category: "elementary" }),
    createWord({ id: 2, category: "middle", matchedDictionaryForms: ["word-2"] }),
    createWord({ id: 3, category: "high", matchedDictionaryForms: ["word-3"] })
  ];

  const result = validateDataSet({
    mode: "partial",
    base: createDictionary(baseWords, {
      total: 3,
      elementary: 1,
      middle: 1,
      high: 1
    }),
    supplemental: null,
    textbookExpressions: null,
    exampleSentences: null
  });

  assert.equal(result.ok, false);
  assert(result.errors.some((error) => error.includes("base stats.dictUnmatched is required")));
  assert(result.errors.some((error) => error.includes("base stats.missingGlosses is required")));
});

test("validateDataSet reports malformed example payload structure with items wording", () => {
  const result = validateDataSet({
    mode: "strict",
    base: createDictionary(
      [createWord({ id: 1, category: "elementary" })],
      {
        total: 1,
        elementary: 1,
        middle: 0,
        high: 0,
        dictUnmatched: 1,
        missingGlosses: 0
      }
    ),
    supplemental: createDictionary([], {
      total: 0,
      supplemental: 0
    }),
    textbookExpressions: createDictionary([], {
      total: 0,
      "elementary-expressions": 0,
      "middle-expressions": 0
    }),
    exampleSentences: {
      stats: {},
      words: []
    }
  });

  assert.equal(result.ok, false);
  assert(result.errors.some((error) => error.includes("example-sentences items must be an array")));
  assert(result.errors.every((error) => !error.includes("example-sentences words must be an array")));
});
