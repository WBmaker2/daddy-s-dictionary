import fs from "node:fs";
import path from "node:path";
import { generateCacheVersion } from "./generate-cache-version.mjs";

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, "dist-pages");
const CACHE_VERSION_PLACEHOLDER = "__CACHE_VERSION__";

const ROOT_FILES = [
  "index.html",
  "app.js",
  "styles.css",
  "sw.js",
  "manifest.webmanifest",
  "README.md"
];

const DIRECTORIES = ["assets", "data", "lib"];

function copyFile(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function copyJsonFile(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.writeFileSync(to, JSON.stringify(JSON.parse(fs.readFileSync(from, "utf8"))), "utf8");
}

function copyDirectory(from, to, { minifyJson = false } = {}) {
  fs.mkdirSync(to, { recursive: true });

  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const sourcePath = path.join(from, entry.name);
    const targetPath = path.join(to, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath, { minifyJson });
    } else if (entry.isFile()) {
      if (minifyJson && entry.name.endsWith(".json")) {
        copyJsonFile(sourcePath, targetPath);
      } else {
        copyFile(sourcePath, targetPath);
      }
    }
  }
}

function emptyDirectory(directory) {
  if (fs.existsSync(directory)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
  fs.mkdirSync(directory, { recursive: true });
}

function replaceServiceWorkerCacheVersion(outputDirectory) {
  const serviceWorkerPath = path.join(outputDirectory, "sw.js");
  const source = fs.readFileSync(serviceWorkerPath, "utf8");
  const version = generateCacheVersion(ROOT);
  const replacement = `${CACHE_VERSION_PLACEHOLDER}`;
  if (!source.includes(replacement)) {
    throw new Error("Cache version placeholder not found in built service worker");
  }

  const replaced = source.replaceAll(replacement, version);
  fs.writeFileSync(serviceWorkerPath, replaced, "utf8");
}

function main() {
  emptyDirectory(OUTPUT_DIR);

  for (const file of ROOT_FILES) {
    copyFile(path.join(ROOT, file), path.join(OUTPUT_DIR, file));
  }

  for (const directory of DIRECTORIES) {
    copyDirectory(path.join(ROOT, directory), path.join(OUTPUT_DIR, directory), {
      minifyJson: directory === "data"
    });
  }

  replaceServiceWorkerCacheVersion(OUTPUT_DIR);

  console.log(`Built Cloudflare Pages output in ${path.relative(ROOT, OUTPUT_DIR)}`);
}

main();
