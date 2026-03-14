import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const BASE_DATA_FILE = path.join(ROOT, "data", "words.json");
const SUPPLEMENTAL_DATA_FILE = path.join(ROOT, "data", "supplemental-words.json");

function loadJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing data file: ${filePath}`);
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function validateWords(words, errors, label) {
  for (const word of words) {
    if (!word.word) {
      errors.push(`${label}: entry ${word.id} is missing a headword`);
    }

    if (!Array.isArray(word.forms) || word.forms.length === 0) {
      errors.push(`${label}: entry ${word.id} is missing searchable forms`);
    }

    if (!word.category) {
      errors.push(`${label}: entry ${word.id} is missing a category`);
    }
  }
}

const basePayload = loadJson(BASE_DATA_FILE);
const supplementalPayload = fs.existsSync(SUPPLEMENTAL_DATA_FILE) ? loadJson(SUPPLEMENTAL_DATA_FILE) : null;
const errors = [];

if (basePayload.stats.total !== 3000) {
  errors.push(`Expected 3000 base entries, got ${basePayload.stats.total}`);
}

if (basePayload.stats.elementary !== 800) {
  errors.push(`Expected 800 elementary entries, got ${basePayload.stats.elementary}`);
}

if (basePayload.stats.middle !== 1200) {
  errors.push(`Expected 1200 middle entries, got ${basePayload.stats.middle}`);
}

if (basePayload.stats.high !== 1000) {
  errors.push(`Expected 1000 high entries, got ${basePayload.stats.high}`);
}

validateWords(basePayload.words, errors, "base");

if (supplementalPayload) {
  if (supplementalPayload.stats.total !== supplementalPayload.words.length) {
    errors.push(
      `Supplemental stats total ${supplementalPayload.stats.total} does not match words length ${supplementalPayload.words.length}`
    );
  }

  if (supplementalPayload.stats.supplemental !== supplementalPayload.words.length) {
    errors.push(
      `Supplemental category count ${supplementalPayload.stats.supplemental} does not match words length ${supplementalPayload.words.length}`
    );
  }

  for (const word of supplementalPayload.words) {
    if (word.category !== "supplemental") {
      errors.push(`Supplemental entry ${word.id} has unexpected category ${word.category}`);
    }
  }

  validateWords(supplementalPayload.words, errors, "supplemental");
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Data check passed.");
  console.log(
    JSON.stringify(
      {
        base: basePayload.stats,
        supplemental: supplementalPayload?.stats ?? null,
        mergedTotal: basePayload.stats.total + (supplementalPayload?.stats.total ?? 0)
      },
      null,
      2
    )
  );
}
