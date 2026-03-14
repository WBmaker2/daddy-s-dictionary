import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DATA_FILE = path.join(ROOT, "data", "words.json");

if (!fs.existsSync(DATA_FILE)) {
  throw new Error(`Missing data file: ${DATA_FILE}`);
}

const payload = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
const { stats, words } = payload;

const errors = [];

if (stats.total !== 3000) {
  errors.push(`Expected 3000 entries, got ${stats.total}`);
}

if (stats.elementary !== 800) {
  errors.push(`Expected 800 elementary entries, got ${stats.elementary}`);
}

if (stats.middle !== 1200) {
  errors.push(`Expected 1200 middle entries, got ${stats.middle}`);
}

if (stats.high !== 1000) {
  errors.push(`Expected 1000 high entries, got ${stats.high}`);
}

for (const word of words) {
  if (!word.word) {
    errors.push(`Entry ${word.id} is missing a headword`);
  }

  if (!Array.isArray(word.forms) || word.forms.length === 0) {
    errors.push(`Entry ${word.id} is missing searchable forms`);
  }

  if (!word.category) {
    errors.push(`Entry ${word.id} is missing a category`);
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Data check passed.");
  console.log(JSON.stringify(stats, null, 2));
}
