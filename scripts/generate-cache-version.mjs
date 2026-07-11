import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const HASH_LENGTH = 12;
const DATA_FILE_SUFFIX = ".json";
const CORE_RUNTIME_FILES = [
  "index.html",
  "app.js",
  "styles.css",
  "sw.js",
  "manifest.webmanifest",
  "assets/icon.svg",
  "assets/icon-192.png",
  "assets/icon-512.png",
  "lib/dom-contract.js",
  "lib/service-worker-routing.js",
  "lib/dictionary-logic.js",
  "lib/pronunciation-controls.js",
  "lib/search-view-state.js"
];

function readJson(filePath) {
  const contents = fs.readFileSync(filePath, "utf8");
  return JSON.parse(contents);
}

function readString(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function collectJsonDataFiles(dataDirectoryPath) {
  if (!fs.existsSync(dataDirectoryPath)) {
    return [];
  }

  return fs
    .readdirSync(dataDirectoryPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(DATA_FILE_SUFFIX))
    .map((entry) => path.join(dataDirectoryPath, entry.name))
    .sort((a, b) => a.localeCompare(b));
}

export function generateCacheVersion(rootDirectory = process.cwd()) {
  const rootPath = path.resolve(rootDirectory);
  const packageJsonPath = path.join(rootPath, "package.json");
  const packageJson = fs.existsSync(packageJsonPath)
    ? readJson(packageJsonPath)
    : { version: "0.0.0" };
  const packageVersion = packageJson.version || "0.0.0";

  const payload = [
    `package-version:${packageVersion}`,
    ...CORE_RUNTIME_FILES.map((relativePath) => {
      const absolutePath = path.join(rootPath, relativePath);

      if (!fs.existsSync(absolutePath)) {
        return undefined;
      }

      return `runtime:${path.posix.join(...relativePath.split(path.sep))}\n${readString(absolutePath)}`;
    }),
    ...collectJsonDataFiles(path.join(rootPath, "data")).map((absolutePath) => {
      const normalizedPath = path.posix.join(...path.relative(rootPath, absolutePath).split(path.sep));
      return `data:${normalizedPath}\n${readString(absolutePath)}`;
    })
  ].filter(Boolean);

  const digest = createHash("sha256")
    .update(payload.join("\n"))
    .digest("hex")
    .slice(0, HASH_LENGTH);

  return `${packageVersion}-${digest}`;
}
