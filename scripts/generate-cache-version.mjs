import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { collectRuntimeModulePaths } from "./runtime-module-graph.mjs";

const HASH_LENGTH = 12;
const DATA_FILE_SUFFIX = ".json";
const BUILD_VERSION_INPUTS = [
  "scripts/build-pages.mjs",
  "scripts/generate-cache-version.mjs",
  "scripts/runtime-module-graph.mjs"
];
const CORE_STATIC_FILES = [
  "index.html",
  "styles.css",
  "manifest.webmanifest",
  "assets/icon.svg",
  "assets/icon-192.png",
  "assets/icon-512.png",
  "assets/fonts/noto-serif-kr-korean-wght-normal.woff2"
];

function readJson(filePath) {
  const contents = fs.readFileSync(filePath, "utf8");
  return JSON.parse(contents);
}

function updateFrame(hash, value) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value, "utf8");
  hash.update(String(buffer.length));
  hash.update(":");
  hash.update(buffer);
}

function updateFileEntry(hash, type, relativePath, filePath) {
  hash.update("entry:");
  updateFrame(hash, type);
  updateFrame(hash, relativePath);
  updateFrame(hash, fs.readFileSync(filePath));
}

function collectJsonDataFiles(dataDirectoryPath) {
  if (!fs.existsSync(dataDirectoryPath)) {
    return [];
  }

  return fs
    .readdirSync(dataDirectoryPath, { withFileTypes: true })
    .flatMap((entry) => {
      const entryPath = path.join(dataDirectoryPath, entry.name);

      if (entry.isDirectory()) {
        return collectJsonDataFiles(entryPath);
      }

      return entry.isFile() && entry.name.endsWith(DATA_FILE_SUFFIX) ? [entryPath] : [];
    })
    .sort((a, b) => a.localeCompare(b));
}

export function generateCacheVersion(rootDirectory = process.cwd()) {
  const rootPath = path.resolve(rootDirectory);
  const packageJsonPath = path.join(rootPath, "package.json");
  const packageJson = fs.existsSync(packageJsonPath)
    ? readJson(packageJsonPath)
    : { version: "0.0.0" };
  const packageVersion = packageJson.version || "0.0.0";
  const runtimeModulePaths = collectRuntimeModulePaths({ rootDirectory: rootPath });
  const hash = createHash("sha256");

  updateFrame(hash, "cache-version-v2");
  updateFrame(hash, packageVersion);

  for (const [type, relativePaths] of [
    ["build", BUILD_VERSION_INPUTS],
    ["runtime", CORE_STATIC_FILES],
    ["runtime", runtimeModulePaths]
  ]) {
    for (const relativePath of relativePaths) {
      const absolutePath = path.join(rootPath, relativePath);

      if (!fs.existsSync(absolutePath)) {
        continue;
      }

      const normalizedPath = path.posix.join(...relativePath.split(path.sep));
      updateFileEntry(hash, type, normalizedPath, absolutePath);
    }
  }

  for (const absolutePath of collectJsonDataFiles(path.join(rootPath, "data"))) {
    const normalizedPath = path.posix.join(...path.relative(rootPath, absolutePath).split(path.sep));
    updateFileEntry(hash, "data", normalizedPath, absolutePath);
  }

  const digest = hash.digest("hex").slice(0, HASH_LENGTH);

  return `${packageVersion}-${digest}`;
}
