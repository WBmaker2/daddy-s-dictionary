import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  filterWords,
  mergeDictionaries,
  mergeExampleSentences,
  searchWords
} from "../lib/dictionary-logic.js";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(TEST_DIR, "..");

function loadPayload(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT_DIR, relativePath), "utf8"));
}

function loadCommittedWords() {
  const base = loadPayload("data/words.json");
  const supplemental = loadPayload("data/supplemental-words.json");
  const textbookExpressions = loadPayload("data/textbook-expressions.json");
  const exampleSentences = loadPayload("data/example-sentences.json");

  const mergedDictionary = mergeDictionaries(
    mergeDictionaries(base, supplemental),
    textbookExpressions
  );

  return mergeExampleSentences(mergedDictionary, exampleSentences).words;
}

const committedWords = loadCommittedWords();

function search(query) {
  return filterWords({
    words: committedWords,
    rawQuery: query,
    category: "all"
  });
}

test("golden query: abandon should return abandon first", () => {
  assert.equal(search("abandon")[0]?.word, "abandon");
});

test("golden query: 버리다 should include abandon", () => {
  const results = search("버리다").map((word) => word.word);
  assert(results.includes("abandon"));
});

test("golden query: elementary expressions are discoverable in committed data", () => {
  const includesElementaryExpression = search("안녕").some(
    (word) => word.category === "elementary-expressions"
  );
  assert.equal(includesElementaryExpression, true);
});

test("golden query: textbook expressions include a usable example", () => {
  const helloExpression = committedWords.find((word) => word.word === "Hello, I'm ...");
  assert.equal(helloExpression?.exampleSentence, "Hello, I'm Minjun.");
});

test("golden query: formerly incomplete expressions have complete examples", () => {
  const expectedExamples = {
    "too ... to": "The box is too heavy to carry.",
    "It goes without saying that ...": "It goes without saying that practice is important.",
    "not ... at all": "This homework is not difficult at all.",
    "cannot ... without doing": "You cannot improve without practicing every day.",
    "cannot ... too": "You cannot be too careful when crossing the street."
  };

  for (const [expression, exampleSentence] of Object.entries(expectedExamples)) {
    const entry = committedWords.find((word) => word.word === expression);
    assert.equal(entry?.exampleSentence, exampleSentence);
  }
});

test("golden query: bank should return bank first", () => {
  assert.equal(search("bank")[0]?.word, "bank");
});

test("searchWords ranks exact Korean keyword matches and reports pagination metadata", () => {
  const result = searchWords({
    words: committedWords,
    rawQuery: "유산",
    category: "all",
    offset: 0,
    limit: 2
  });

  assert.equal(result.items[0].word, "asset");
  assert.equal(result.total, 3);
  assert.equal(result.shown, 2);
  assert.equal(result.hasMore, true);
});

test("searchWords counts all matches before limiting results", () => {
  const result = searchWords({
    words: committedWords,
    rawQuery: "a",
    category: "all",
    offset: 0,
    limit: 6
  });

  assert(result.total > 60);
  assert.equal(result.items.length, 6);
});

test("filterWords preserves the legacy default limit of 60 results", () => {
  const words = Array.from({ length: 61 }, (_, index) => ({
    id: index + 1,
    word: `match-${index + 1}`,
    category: "elementary",
    forms: [`match-${index + 1}`],
    searchKeywords: { english: ["match"], korean: [] }
  }));

  const result = filterWords({ words, rawQuery: "match", category: "all" });

  assert.equal(result.length, 60);
  assert.equal(result[0].id, 1);
  assert.equal(result.at(-1).id, 60);
});

test("searchWords ranks exact alternate English forms above prefix-only matches", () => {
  for (const [query, expectedWord] of [
    ["data", "datum"],
    ["lab", "laboratory"],
    ["media", "medium"],
    ["mom", "mother"]
  ]) {
    const result = searchWords({
      words: committedWords,
      rawQuery: query,
      category: "all",
      offset: 0,
      limit: 6
    });

    assert.equal(result.items[0]?.word, expectedWord, query);
  }
});
