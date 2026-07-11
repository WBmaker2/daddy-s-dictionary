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

function readString(filePath) {
  return fs.readFileSync(filePath, "utf8");
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

  const payload = [
    `package-version:${packageVersion}`,
    ...BUILD_VERSION_INPUTS.map((relativePath) => {
      const absolutePath = path.join(rootPath, relativePath);

      if (!fs.existsSync(absolutePath)) {
        return undefined;
      }

      return `build:${relativePath}\n${readString(absolutePath)}`;
    }),
    ...CORE_STATIC_FILES.map((relativePath) => {
      const absolutePath = path.join(rootPath, relativePath);

      if (!fs.existsSync(absolutePath)) {
        return undefined;
      }

      return `runtime:${path.posix.join(...relativePath.split(path.sep))}\n${readString(absolutePath)}`;
    }),
    ...runtimeModulePaths.map((relativePath) => {
      const absolutePath = path.join(rootPath, relativePath);
      return `runtime:${relativePath}\n${readString(absolutePath)}`;
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
