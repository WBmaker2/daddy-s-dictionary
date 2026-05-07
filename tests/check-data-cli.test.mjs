import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TEST_DIR = fileURLToPath(new URL(".", import.meta.url));
const ROOT = path.resolve(TEST_DIR, "..");

function run(scriptName) {
  return execFileSync("npm", ["run", "--silent", scriptName], {
    cwd: ROOT,
    encoding: "utf8"
  });
}

test("package.json keeps the expected data script wiring", () => {
  const packageJsonPath = path.join(ROOT, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

  assert.equal(packageJson.scripts["generate:data"], "node scripts/generate-data.mjs");
  assert.equal(
    packageJson.scripts["generate:data:textbook-expressions"],
    "node scripts/generate-textbook-expressions.mjs"
  );
  assert.equal(
    packageJson.scripts["generate:data:example-sentences"],
    "node scripts/generate-example-sentences.mjs"
  );
  assert.equal(
    packageJson.scripts["import:data:supplemental"],
    "python3 scripts/import-wordbook-xls.py"
  );
  assert.equal(packageJson.scripts["check:data"], "node scripts/check-data.mjs");
  assert.equal(packageJson.scripts["check:data:strict"], "node scripts/check-data.mjs --strict");
  assert.equal(packageJson.scripts["check:data:partial"], "node scripts/check-data.mjs --partial");
  assert.equal(packageJson.scripts["test:data"], "node --test");
});

test("npm data-check scripts stay wired to the expected CLI modes", () => {
  const defaultOutput = run("check:data");
  const strictOutput = run("check:data:strict");
  const partialOutput = run("check:data:partial");

  assert.match(defaultOutput, /Data check passed \(strict\)\./);
  assert.match(strictOutput, /Data check passed \(strict\)\./);
  assert.match(partialOutput, /Data check passed \(partial\)\./);
});
