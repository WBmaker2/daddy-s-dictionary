import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { collectRuntimeModulePaths } from "../scripts/runtime-module-graph.mjs";

function writeFile(rootDir, relativePath, contents) {
  const filePath = path.join(rootDir, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
}

test("collectRuntimeModulePaths follows transitive static, side-effect, re-export, dynamic, and importScripts imports", () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "runtime-module-graph-"));
  writeFile(
    rootDir,
    "app.js",
    [
      'import "./side-effect.js";',
      'import { label } from "./nested/reexport.js";',
      'export { label as exportedLabel } from "./exported.js";',
      'void import("./lazy.js?v=release-123#module");'
    ].join("\n")
  );
  writeFile(rootDir, "side-effect.js", "export const sideEffect = true;");
  writeFile(rootDir, "nested/reexport.js", 'export * from "./transitive.js";');
  writeFile(rootDir, "nested/transitive.js", "export const label = 'nested';");
  writeFile(rootDir, "exported.js", "export const label = 'exported';");
  writeFile(rootDir, "lazy.js", "export const lazy = true;");
  writeFile(rootDir, "sw.js", 'importScripts("./worker/first.js?v=release-123", "./worker/second.js#worker");');
  writeFile(rootDir, "worker/first.js", 'import "../shared.js?v=release-123#shared";');
  writeFile(rootDir, "worker/second.js", "self.second = true;");
  writeFile(rootDir, "shared.js", "export const shared = true;");

  assert.deepEqual(
    collectRuntimeModulePaths({ rootDirectory: rootDir }),
    [
      "app.js",
      "exported.js",
      "lazy.js",
      "nested/reexport.js",
      "nested/transitive.js",
      "shared.js",
      "side-effect.js",
      "sw.js",
      "worker/first.js",
      "worker/second.js"
    ]
  );
});
