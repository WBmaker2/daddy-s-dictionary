import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  filterWords,
  mergeDictionaries,
  mergeExampleSentences
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

test("golden query: bank should return bank first", () => {
  assert.equal(search("bank")[0]?.word, "bank");
});
