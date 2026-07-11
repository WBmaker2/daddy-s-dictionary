import fs from "node:fs";
import path from "node:path";
import { generateCacheVersion } from "./generate-cache-version.mjs";
import { collectRuntimeModulePaths } from "./runtime-module-graph.mjs";

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, "dist-pages");
const CACHE_VERSION_PLACEHOLDER = "__CACHE_VERSION__";
const ASSET_VERSION_PLACEHOLDER = "__ASSET_VERSION__";

const ROOT_FILES = [
  "index.html",
  "app.js",
  "styles.css",
  "sw.js",
  "manifest.webmanifest",
  "README.md"
];

const DIRECTORIES = ["assets", "data", "lib"];

function toPosixPath(filePath) {
  return filePath.split(path.sep).join(path.posix.sep);
}

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

function collectJsonDataPaths(dataDirectoryPath, rootDirectory) {
  if (!fs.existsSync(dataDirectoryPath)) {
    return [];
  }

  return fs
    .readdirSync(dataDirectoryPath, { withFileTypes: true })
    .flatMap((entry) => {
      const entryPath = path.join(dataDirectoryPath, entry.name);

      if (entry.isDirectory()) {
        return collectJsonDataPaths(entryPath, rootDirectory);
      }

      return entry.isFile() && entry.name.endsWith(".json")
        ? [toPosixPath(path.relative(rootDirectory, entryPath))]
        : [];
    })
    .sort((left, right) => left.localeCompare(right));
}

function splitSpecifier(specifier) {
  const match = specifier.match(/^([^?#]+)(.*)$/);
  return match ? { pathname: match[1], suffix: match[2] } : { pathname: specifier, suffix: "" };
}

function appendVersion(specifier, version) {
  const { pathname, suffix } = splitSpecifier(specifier);
  const hashIndex = suffix.indexOf("#");
  const query = hashIndex === -1 ? suffix : suffix.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : suffix.slice(hashIndex);
  const separator = query ? "&" : "?";

  return `${pathname}${query}${separator}v=${version}${hash}`;
}

function resolveSpecifierPath(importerPath, specifier) {
  const { pathname } = splitSpecifier(specifier);

  if (!pathname.startsWith("./") && !pathname.startsWith("../")) {
    return null;
  }

  return toPosixPath(path.normalize(path.join(path.dirname(importerPath), pathname)));
}

function resolveVersionedPath(importerPath, specifier, versionedPaths) {
  const moduleRelativePath = resolveSpecifierPath(importerPath, specifier);

  return moduleRelativePath && versionedPaths.has(moduleRelativePath) ? moduleRelativePath : null;
}

function pinRelativeSpecifiers(source, importerPath, version, versionedPaths) {
  return source.replace(/(["'])(\.{1,2}\/[^"']+)\1/g, (match, quote, specifier) => {
    const resolvedPath = resolveVersionedPath(importerPath, specifier, versionedPaths);

    if (!resolvedPath || !versionedPaths.has(resolvedPath)) {
      return match;
    }

    return `${quote}${appendVersion(specifier, version)}${quote}`;
  });
}

function pinServiceWorkerImports(source, version, versionedPaths) {
  return source.replace(
    /(importScripts\s*\(\s*["'])(\.{1,2}\/[^"']+)(["'])/g,
    (match, start, specifier, end) => {
      const resolvedPath = resolveVersionedPath("sw.js", specifier, versionedPaths);

      if (!resolvedPath || !versionedPaths.has(resolvedPath)) {
        return match;
      }

      return `${start}${appendVersion(specifier, version)}${end}`;
    }
  );
}

function replaceBuildPlaceholders(source, version) {
  return source
    .replaceAll(CACHE_VERSION_PLACEHOLDER, version)
    .replaceAll(ASSET_VERSION_PLACEHOLDER, version);
}

function pinReleaseAssets(outputDirectory, version) {
  const runtimeModules = collectRuntimeModulePaths({ rootDirectory: ROOT });
  const versionedRuntimeModules = runtimeModules.filter((modulePath) => modulePath !== "sw.js");
  const versionedPaths = new Set([
    "app.js",
    "styles.css",
    "manifest.webmanifest",
    "assets/icon.svg",
    "assets/icon-192.png",
    "assets/icon-512.png",
    "assets/fonts/noto-serif-kr-korean-wght-normal.woff2",
    ...versionedRuntimeModules,
    ...collectJsonDataPaths(path.join(ROOT, "data"), ROOT)
  ]);
  const filesToRewrite = ["index.html", "styles.css", ...runtimeModules];

  for (const relativePath of filesToRewrite) {
    const outputPath = path.join(outputDirectory, relativePath);
    let source = fs.readFileSync(outputPath, "utf8");

    source = relativePath === "sw.js"
      ? pinServiceWorkerImports(source, version, versionedPaths)
      : pinRelativeSpecifiers(source, relativePath, version, versionedPaths);

    fs.writeFileSync(outputPath, replaceBuildPlaceholders(source, version), "utf8");
  }
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

  pinReleaseAssets(OUTPUT_DIR, generateCacheVersion(ROOT));

  console.log(`Built Cloudflare Pages output in ${path.relative(ROOT, OUTPUT_DIR)}`);
}

main();
