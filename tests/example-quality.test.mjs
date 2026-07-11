import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(TEST_DIR, "..");
const qualityModule = await import("../scripts/example-quality.mjs").catch(() => null);

function loadPayload(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT_DIR, relativePath), "utf8"));
}

function loadCommittedCorpus() {
  const base = loadPayload("data/words.json");
  const supplemental = loadPayload("data/supplemental-words.json");
  const textbookExpressions = loadPayload("data/textbook-expressions.json");
  const examples = loadPayload("data/example-sentences.json");

  return {
    words: [...base.words, ...supplemental.words, ...textbookExpressions.words],
    items: examples.items
  };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeTemplateForCorpusCheck(word, sentence) {
  return sentence.replace(new RegExp(escapeRegExp(word), "gi"), "{word}");
}

test("committed corpus contains one non-empty example for every dictionary ID", () => {
  const { words, items } = loadCommittedCorpus();
  const wordIds = new Set(words.map((word) => word.id));
  const exampleIds = new Set(items.map((item) => item.id));

  assert.equal(items.filter((item) => item.exampleSentence.trim().length > 0).length, 3489);
  assert.equal(items.length, 3489);
  assert.equal(exampleIds.size, 3489);
  assert.deepEqual([...exampleIds].sort((left, right) => left - right), [...wordIds].sort((left, right) => left - right));
});

test("committed corpus keeps normalized template use at or below 20 percent", () => {
  const { words, items } = loadCommittedCorpus();
  const wordsById = new Map(words.map((word) => [word.id, word]));
  const templateCounts = new Map();

  for (const item of items) {
    const word = wordsById.get(item.id);
    const template = normalizeTemplateForCorpusCheck(word.word, item.exampleSentence);
    templateCounts.set(template, (templateCounts.get(template) ?? 0) + 1);
  }

  const dominantCount = Math.max(...templateCounts.values());
  assert.ok(dominantCount / items.length <= 0.2, `dominant template ratio was ${dominantCount / items.length}`);
});

test("quality helpers normalize target words and validate complete corpora", () => {
  assert.ok(qualityModule, "scripts/example-quality.mjs must export quality helpers");
  assert.equal(
    qualityModule.normalizeExampleTemplate("Do", "I do my homework after dinner."),
    "I {word} my homework after dinner."
  );

  const { words, items } = loadCommittedCorpus();
  const result = qualityModule.validateExampleQuality({
    items,
    words,
    maxTemplateRatio: 0.2
  });

  assert.equal(result.ok, true, result.errors.join("\n"));
});

test("committed corpus preserves curated classroom examples", () => {
  const { words, items } = loadCommittedCorpus();
  const examplesByWord = new Map(
    items.map((item) => [words.find((word) => word.id === item.id)?.word.toLowerCase(), item.exampleSentence])
  );

  assert.deepEqual(
    Object.fromEntries(["do", "bank", "version", "zoo", "young"].map((word) => [word, examplesByWord.get(word)])),
    {
      do: "I do my homework after dinner.",
      bank: "She deposited her allowance in the bank.",
      version: "This is the latest version of the school guide.",
      zoo: "Our class saw giraffes at the zoo.",
      young: "The young bird is learning to fly."
    }
  );
});
