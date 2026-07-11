import test from "node:test";
import assert from "node:assert/strict";

import {
  comparePronunciation,
  filterWords,
  loadDictionaryData,
  mergeDictionaries,
  mergeExampleSentences,
  normalizeDisplayForm,
  normalizeEnglish,
  normalizeKorean,
  searchWords
} from "../lib/dictionary-logic.js";

function createWord(overrides = {}) {
  const id = overrides.id ?? 1;
  const word = overrides.word ?? `word-${id}`;

  return {
    id,
    word,
    category: overrides.category ?? "elementary",
    forms: overrides.forms ?? [word],
    searchKeywords: overrides.searchKeywords ?? {
      english: [word.toLowerCase()],
      korean: [`뜻-${id}`]
    }
  };
}

const DICTIONARY_FILES = {
  base: { path: "./data/words.json" },
  supplemental: { path: "./data/supplemental-words.json", optional: true },
  textbookExpressions: { path: "./data/textbook-expressions.json", optional: true },
  exampleSentences: { path: "./data/example-sentences.json", optional: true }
};

test("normalization helpers keep search inputs consistent", () => {
  assert.equal(normalizeEnglish("  HeLLo  ’World`  "), "hello 'world'");
  assert.equal(normalizeKorean("  뜻   풀이  "), "뜻 풀이");
  assert.equal(normalizeDisplayForm(" What's, up?! "), "what's up");
});

test("merge helpers preserve base data when optional payloads are missing", () => {
  const baseDictionary = {
    generatedAt: "2026-01-01T00:00:00Z",
    sources: ["base"],
    stats: { elementary: 1 },
    words: [createWord({ id: 1 })]
  };

  assert.equal(mergeDictionaries(baseDictionary, null), baseDictionary);
  assert.equal(mergeExampleSentences(baseDictionary, null), baseDictionary);
});

test("loadDictionaryData merges dictionaries and example sentences with injected loaders", async () => {
  const calls = [];
  const payloads = new Map([
    [
      "./data/words.json",
      {
        generatedAt: "2026-01-01T00:00:00Z",
        sources: ["base"],
        stats: { elementary: 1, middle: 0 },
        words: [createWord({ id: 1, word: "Apple" })]
      }
    ],
    [
      "./data/supplemental-words.json",
      {
        generatedAt: "2026-01-02T00:00:00Z",
        sources: ["supplemental"],
        stats: { supplemental: 1 },
        words: [createWord({ id: 3001, word: "after school", category: "supplemental" })]
      }
    ],
    [
      "./data/textbook-expressions.json",
      {
        generatedAt: "2026-01-03T00:00:00Z",
        sources: ["expressions"],
        stats: { "elementary-expressions": 1 },
        words: [
          createWord({
            id: 3408,
            word: "How are you?",
            category: "elementary-expressions",
            forms: ["How are you?"]
          })
        ]
      }
    ],
    [
      "./data/example-sentences.json",
      {
        items: [
          { id: 1, exampleSentence: "An apple a day." },
          { id: 3408, exampleSentence: "How are you today?" }
        ]
      }
    ]
  ]);

  const dictionary = await loadDictionaryData({
    files: DICTIONARY_FILES,
    loadFile: async (path, options = {}) => {
      calls.push({ path, optional: options.optional ?? false });
      return payloads.get(path) ?? null;
    }
  });

  assert.deepEqual(calls, [
    { path: "./data/words.json", optional: false },
    { path: "./data/supplemental-words.json", optional: true },
    { path: "./data/textbook-expressions.json", optional: true },
    { path: "./data/example-sentences.json", optional: true }
  ]);
  assert.equal(dictionary.generatedAt, "2026-01-03T00:00:00Z");
  assert.deepEqual(dictionary.sources, ["base", "supplemental", "expressions"]);
  assert.deepEqual(dictionary.stats, {
    elementary: 1,
    middle: 0,
    supplemental: 1,
    "elementary-expressions": 1
  });
  assert.deepEqual(
    dictionary.words.map((word) => [word.id, word.exampleSentence ?? ""]),
    [
      [1, "An apple a day."],
      [3001, ""],
      [3408, "How are you today?"]
    ]
  );
});

test("loadDictionaryData propagates required base file load failure", async () => {
  await assert.rejects(
    loadDictionaryData({
      files: DICTIONARY_FILES,
      loadFile: async (path) => {
        if (path === "./data/words.json") {
          throw new Error("base load failed");
        }

        return null;
      }
    }),
    /base load failed/
  );
});

test("loadDictionaryData tolerates optional files returning null", async () => {
  const dictionary = await loadDictionaryData({
    files: DICTIONARY_FILES,
    loadFile: async (path) => {
      if (path === "./data/words.json") {
        return {
          generatedAt: "2026-01-01T00:00:00Z",
          sources: ["base"],
          stats: { elementary: 1 },
          words: [createWord({ id: 1, word: "Apple" })]
        };
      }

      return null;
    }
  });

  assert.deepEqual(dictionary.sources, ["base"]);
  assert.deepEqual(dictionary.stats, { elementary: 1 });
  assert.deepEqual(dictionary.words.map((word) => word.id), [1]);
});

test("loadDictionaryData ignores loader exceptions for optional source files", async () => {
  const baseDictionary = {
    generatedAt: "2026-01-01T00:00:00Z",
    sources: ["base"],
    stats: { elementary: 1 },
    words: [createWord({ id: 1, word: "Apple" })]
  };
  const optionalErrors = new Map([
    ["./data/supplemental-words.json", new Error("network unavailable")],
    ["./data/textbook-expressions.json", new Error("server returned 500")],
    ["./data/example-sentences.json", new SyntaxError("malformed JSON")]
  ]);

  const dictionary = await loadDictionaryData({
    files: DICTIONARY_FILES,
    loadFile: async (path) => {
      if (path === "./data/words.json") {
        return baseDictionary;
      }

      throw optionalErrors.get(path);
    }
  });

  assert.deepEqual(dictionary, baseDictionary);
});

test("loadDictionaryData forwards custom paths and optional flags from the file manifest", async () => {
  const seen = [];
  const customFiles = {
    base: { path: "/custom/base.json" },
    supplemental: { path: "/custom/supplemental.json", optional: true },
    textbookExpressions: { path: "/custom/expressions.json", optional: true },
    exampleSentences: { path: "/custom/examples.json", optional: true }
  };

  await loadDictionaryData({
    files: customFiles,
    loadFile: async (path, options = {}) => {
      seen.push([path, options.optional ?? false]);

      if (path === "/custom/base.json") {
        return {
          generatedAt: "2026-01-01T00:00:00Z",
          sources: ["base"],
          stats: { elementary: 1 },
          words: [createWord({ id: 1 })]
        };
      }

      return null;
    }
  });

  assert.deepEqual(seen, [
    ["/custom/base.json", false],
    ["/custom/supplemental.json", true],
    ["/custom/expressions.json", true],
    ["/custom/examples.json", true]
  ]);
});

test("filterWords keeps default ordering and ranks exact matches above partial matches", () => {
  const words = [
    createWord({
      id: 30,
      word: "Banana",
      searchKeywords: {
        english: ["banana"],
        korean: ["바나나"]
      }
    }),
    createWord({
      id: 10,
      word: "Bank",
      searchKeywords: {
        english: ["bank"],
        korean: ["은행"]
      }
    }),
    createWord({
      id: 20,
      word: "Banker",
      searchKeywords: {
        english: ["banker"],
        korean: ["은행원"]
      }
    }),
    createWord({
      id: 40,
      word: "after school",
      category: "supplemental",
      forms: ["after school"],
      searchKeywords: {
        english: ["after school"],
        korean: ["방과 후"]
      }
    })
  ];

  assert.deepEqual(
    filterWords({ words, rawQuery: "", category: "all" }).map((word) => word.id),
    [10, 20, 30, 40]
  );
  assert.deepEqual(
    filterWords({ words, rawQuery: "  BANK  ", category: "all" }).map((word) => word.id),
    [10, 20]
  );
  assert.deepEqual(
    filterWords({ words, rawQuery: "방과", category: "supplemental" }).map((word) => word.id),
    [40]
  );
});

test("searchWords returns paginated result metadata", () => {
  const words = [
    createWord({
      id: 3,
      word: "abort",
      searchKeywords: { english: ["abort"], korean: ["유산하다"] }
    }),
    createWord({
      id: 2,
      word: "asset",
      searchKeywords: { english: ["asset"], korean: ["유산"] }
    }),
    createWord({
      id: 1,
      word: "heritage",
      searchKeywords: { english: ["heritage"], korean: ["유산"] }
    })
  ];

  assert.deepEqual(searchWords({ words, rawQuery: "", category: "all", offset: 1, limit: 1 }), {
    items: [words[1]],
    total: 3,
    shown: 2,
    hasMore: true
  });
});

test("comparePronunciation returns graduated feedback based on transcript similarity", () => {
  assert.deepEqual(comparePronunciation(["teacher"], "Teacher!"), {
    status: "excellent",
    text: '잘했어요. "Teacher!" 발음이 teacher와 매우 가깝습니다.'
  });
  assert.deepEqual(comparePronunciation(["teacher"], "techer"), {
    status: "good",
    text: '거의 맞았어요. "techer"로 들렸습니다. 한 번 더 또박또박 말해 보세요.'
  });
  assert.deepEqual(comparePronunciation(["teacher"], "banana"), {
    status: "retry",
    text: '지금은 "banana"로 인식됐습니다. 입 모양과 강세를 조금 더 크게 말해 보세요.'
  });
});
