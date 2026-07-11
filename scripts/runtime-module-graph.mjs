import fs from "node:fs";
import path from "node:path";

const DEFAULT_ENTRY_PATHS = ["app.js", "sw.js"];
const RELATIVE_SPECIFIER_PATTERN = /(?:\.{1,2}\/)[^"']+/;

function getRelativeModuleSpecifiers(source) {
  const specifiers = new Set();
  const sideEffectImportPattern = /\bimport\s*["']((?:\.{1,2}\/)[^"']+)["']/g;
  const staticFromPattern = /\b(?:import|export)\s+[\w\s*$,{}]+?\s+from\s+["']((?:\.{1,2}\/)[^"']+)["']/g;
  const dynamicImportPattern = /\bimport\s*\(\s*["']((?:\.{1,2}\/)[^"']+)["']\s*\)/g;
  const importScriptsPattern = /\bimportScripts\s*\(([^)]*)\)/g;

  for (const match of source.matchAll(sideEffectImportPattern)) {
    specifiers.add(match[1]);
  }

  for (const match of source.matchAll(staticFromPattern)) {
    specifiers.add(match[1]);
  }

  for (const match of source.matchAll(dynamicImportPattern)) {
    specifiers.add(match[1]);
  }

  for (const call of source.matchAll(importScriptsPattern)) {
    for (const match of call[1].matchAll(/["']((?:\.{1,2}\/)[^"']+)["']/g)) {
      specifiers.add(match[1]);
    }
  }

  return [...specifiers];
}

function toRelativeRuntimePath(rootDirectory, absolutePath) {
  const relativePath = path.relative(rootDirectory, absolutePath);

  if (!relativePath || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) {
    return null;
  }

  return relativePath.split(path.sep).join(path.posix.sep);
}

function resolveRelativeModulePath(rootDirectory, importerPath, specifier) {
  const pathname = specifier.split(/[?#]/, 1)[0];

  if (!RELATIVE_SPECIFIER_PATTERN.test(pathname)) {
    return null;
  }

  return toRelativeRuntimePath(rootDirectory, path.resolve(path.dirname(importerPath), pathname));
}

export function collectRuntimeModulePaths({
  rootDirectory = process.cwd(),
  entryPaths = DEFAULT_ENTRY_PATHS
} = {}) {
  const rootPath = path.resolve(rootDirectory);
  const pendingPaths = entryPaths
    .map((entryPath) => toRelativeRuntimePath(rootPath, path.resolve(rootPath, entryPath)))
    .filter(Boolean);
  const visitedPaths = new Set();

  while (pendingPaths.length > 0) {
    const relativePath = pendingPaths.pop();

    if (visitedPaths.has(relativePath)) {
      continue;
    }

    visitedPaths.add(relativePath);
    const absolutePath = path.join(rootPath, relativePath);
    const source = fs.readFileSync(absolutePath, "utf8");

    for (const specifier of getRelativeModuleSpecifiers(source)) {
      const dependencyPath = resolveRelativeModulePath(rootPath, absolutePath, specifier);
      if (dependencyPath && !visitedPaths.has(dependencyPath)) {
        pendingPaths.push(dependencyPath);
      }
    }
  }

  return [...visitedPaths].sort((left, right) => left.localeCompare(right));
}
