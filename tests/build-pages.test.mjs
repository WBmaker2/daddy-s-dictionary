import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { generateCacheVersion } from "../scripts/generate-cache-version.mjs";
import { collectRuntimeModulePaths } from "../scripts/runtime-module-graph.mjs";

const TEST_DIR = fileURLToPath(new URL(".", import.meta.url));
const ROOT = path.resolve(TEST_DIR, "..");
const BUILD_SCRIPT_SOURCE = fs.readFileSync(path.join(ROOT, "scripts", "build-pages.mjs"), "utf8");
const SERVICE_WORKER_SOURCE = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
const APP_SOURCE = fs.readFileSync(path.join(ROOT, "app.js"), "utf8");
const RUNTIME_MODULES = collectRuntimeModulePaths({ rootDirectory: ROOT });
const PRECACHE_RUNTIME_MODULES = RUNTIME_MODULES.filter((modulePath) => modulePath !== "sw.js");

function writeFile(rootDir, relativePath, contents) {
  const filePath = path.join(rootDir, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
}

function createFixtureProject(rootDir) {
  writeFile(rootDir, "scripts/build-pages.mjs", BUILD_SCRIPT_SOURCE);
  writeFile(
    rootDir,
    "scripts/generate-cache-version.mjs",
    fs.readFileSync(path.join(ROOT, "scripts", "generate-cache-version.mjs"), "utf8")
  );
  writeFile(
    rootDir,
    "scripts/runtime-module-graph.mjs",
    fs.readFileSync(path.join(ROOT, "scripts", "runtime-module-graph.mjs"), "utf8")
  );
  writeFile(rootDir, "package.json", JSON.stringify({ name: "fixture", version: "1.1.0" }));
  writeFile(
    rootDir,
    "index.html",
    '<!doctype html><link rel="stylesheet" href="./styles.css"><script type="module" src="./app.js"></script>'
  );
  writeFile(rootDir, "app.js", APP_SOURCE);
  writeFile(rootDir, "styles.css", '@font-face{src:url("./assets/fonts/noto-serif-kr-korean-wght-normal.woff2")}');
  writeFile(rootDir, "sw.js", SERVICE_WORKER_SOURCE);
  writeFile(
    rootDir,
    "manifest.webmanifest",
    JSON.stringify({
      start_url: "./",
      icons: [
        { src: "./assets/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "./assets/icon-512.png", sizes: "512x512", type: "image/png" }
      ]
    })
  );
  writeFile(rootDir, "README.md", "# fixture");
  writeFile(rootDir, "assets/icon.svg", "<svg></svg>");
  writeFile(rootDir, "assets/icon-192.png", "icon");
  writeFile(rootDir, "assets/icon-512.png", "icon");
  writeFile(rootDir, "assets/fonts/noto-serif-kr-korean-wght-normal.woff2", "font");
  writeFile(rootDir, "data/words.json", '{\n  "words": []\n}\n');
  writeFile(rootDir, "data/supplemental-words.json", '{\n  "words": []\n}\n');
  writeFile(rootDir, "data/textbook-expressions.json", '{\n  "words": []\n}\n');
  writeFile(rootDir, "data/example-sentences.json", '{\n  "items": []\n}\n');
  writeFile(rootDir, "data/nested/extra.json", '{\n  "nested": true\n}\n');
  writeFile(rootDir, "data/notes.txt", "keep this asset byte-for-byte\n");
  writeFile(rootDir, "lib/fixture.json", '{\n  "keepFormatting": true\n}\n');
  for (const modulePath of RUNTIME_MODULES) {
    if (modulePath === "app.js" || modulePath === "sw.js") {
      continue;
    }
    const source = ["lib/service-worker-routing.js", "lib/offline-status.js"].includes(modulePath)
      ? fs.readFileSync(path.join(ROOT, modulePath), "utf8")
      : "export const fixtureModule = true;";
    writeFile(rootDir, modulePath, source);
  }
}

test("build-pages minifies deployment data JSON without changing payloads or other assets", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "build-pages-"));
  createFixtureProject(tempRoot);

  execFileSync("node", ["scripts/build-pages.mjs"], {
    cwd: tempRoot,
    encoding: "utf8"
  });

  for (const relativePath of [
    "data/words.json",
    "data/supplemental-words.json",
    "data/textbook-expressions.json",
    "data/example-sentences.json",
    "data/nested/extra.json"
  ]) {
    const source = fs.readFileSync(path.join(tempRoot, relativePath), "utf8");
    const built = fs.readFileSync(path.join(tempRoot, "dist-pages", relativePath), "utf8");

    assert.deepEqual(JSON.parse(built), JSON.parse(source));
    assert.equal(built.includes("\n"), false);
    assert.equal(built.includes("  "), false);
    assert.ok(Buffer.byteLength(built) < Buffer.byteLength(source));
  }

  assert.deepEqual(
    fs.readFileSync(path.join(tempRoot, "dist-pages", "data", "notes.txt")),
    fs.readFileSync(path.join(tempRoot, "data", "notes.txt"))
  );
  assert.deepEqual(
    fs.readFileSync(path.join(tempRoot, "dist-pages", "lib", "fixture.json")),
    fs.readFileSync(path.join(tempRoot, "lib", "fixture.json"))
  );
});

test("build-pages fails instead of emitting malformed deployment data JSON", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "build-pages-"));
  createFixtureProject(tempRoot);
  writeFile(tempRoot, "data/nested/malformed.json", "{ not valid JSON");

  assert.throws(() => {
    execFileSync("node", ["scripts/build-pages.mjs"], {
      cwd: tempRoot,
      encoding: "utf8",
      stdio: "pipe"
    });
  });
});

function evaluateBuiltServiceWorker(entryPath) {
  const listeners = new Map();
  const openedCaches = [];
  const context = {
    URL,
    caches: {
      async match() {
        return null;
      },
      async open(name) {
        openedCaches.push(name);
        return {
          async add() {},
          async addAll() {},
          async put() {}
        };
      },
      async keys() {
        return [];
      },
      async delete() {
        return true;
      }
    },
    fetch: async () => new Response("", { status: 200 }),
    Response,
    console,
    globalThis: {},
    self: {
      location: { href: "https://example.com/", origin: "https://example.com" },
      registration: { scope: "https://example.com/" },
      addEventListener(type, handler) {
        listeners.set(type, handler);
      },
      skipWaiting() {},
      clients: {
        claim() {}
      }
    }
  };

  context.globalThis = context;
  context.self.globalThis = context;
  context.importScripts = (...scriptPaths) => {
    for (const scriptPath of scriptPaths) {
      const importedPath = path.resolve(path.dirname(entryPath), scriptPath.split(/[?#]/, 1)[0]);
      const importedSource = fs.readFileSync(importedPath, "utf8");
      vm.runInNewContext(importedSource, context, { filename: importedPath });
    }
  };

  const entrySource = fs.readFileSync(entryPath, "utf8");
  vm.runInNewContext(entrySource, context, { filename: entryPath });

  return {
    listeners,
    openedCaches
  };
}

async function dispatchInstall(evaluatedServiceWorker) {
  const installHandler = evaluatedServiceWorker.listeners.get("install");
  assert.equal(typeof installHandler, "function");

  let installPromise = null;
  installHandler({
    waitUntil(value) {
      installPromise = Promise.resolve(value);
    }
  });

  assert.ok(installPromise);
  await installPromise;
}

test("build-pages copies the service worker helper and built sw.js can import it", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "build-pages-"));
  createFixtureProject(tempRoot);

  execFileSync("node", ["scripts/build-pages.mjs"], {
    cwd: tempRoot,
    encoding: "utf8"
  });

  const builtHelperPath = path.join(tempRoot, "dist-pages", "lib", "service-worker-routing.js");
  const builtSwPath = path.join(tempRoot, "dist-pages", "sw.js");

  assert.equal(fs.existsSync(builtHelperPath), true);
  assert.equal(fs.existsSync(builtSwPath), true);

  for (const modulePath of PRECACHE_RUNTIME_MODULES) {
    assert.equal(fs.existsSync(path.join(tempRoot, "dist-pages", modulePath)), true);
    assert.match(fs.readFileSync(builtSwPath, "utf8"), new RegExp(JSON.stringify(`./${modulePath}`)));
  }

  const evaluatedServiceWorker = evaluateBuiltServiceWorker(builtSwPath);
  assert.equal(typeof evaluatedServiceWorker.listeners.get("fetch"), "function");
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("build-pages injects deterministic cache version into dist service worker", async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "build-pages-"));
  createFixtureProject(tempRoot);

  execFileSync("node", ["scripts/build-pages.mjs"], {
    cwd: tempRoot,
    encoding: "utf8"
  });

  const builtSwPath = path.join(tempRoot, "dist-pages", "sw.js");
  const builtSwSource = fs.readFileSync(builtSwPath, "utf8");
  const expectedVersion = generateCacheVersion(tempRoot);

  assert.equal(builtSwSource.includes("__CACHE_VERSION__"), false);
  assert.match(builtSwSource, new RegExp(escapeRegExp(`const CACHE_VERSION = "${expectedVersion}";`)));
  assert.equal(builtSwSource.includes("daddys-dictionary-dev"), false);

  const evaluatedServiceWorker = evaluateBuiltServiceWorker(builtSwPath);
  await dispatchInstall(evaluatedServiceWorker);

  assert.equal(evaluatedServiceWorker.openedCaches.includes(`daddys-dictionary-${expectedVersion}`), true);
});

test("build-pages pins every built shell reference to one generated release version", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "build-pages-"));
  createFixtureProject(tempRoot);

  execFileSync("node", ["scripts/build-pages.mjs"], {
    cwd: tempRoot,
    encoding: "utf8"
  });

  const version = generateCacheVersion(tempRoot);
  const outputRoot = path.join(tempRoot, "dist-pages");
  const builtIndex = fs.readFileSync(path.join(outputRoot, "index.html"), "utf8");
  const builtStyles = fs.readFileSync(path.join(outputRoot, "styles.css"), "utf8");
  const builtApp = fs.readFileSync(path.join(outputRoot, "app.js"), "utf8");
  const builtOfflineStatus = fs.readFileSync(path.join(outputRoot, "lib", "offline-status.js"), "utf8");
  const builtSw = fs.readFileSync(path.join(outputRoot, "sw.js"), "utf8");
  const builtManifestSource = fs.readFileSync(path.join(outputRoot, "manifest.webmanifest"), "utf8");
  const builtManifest = JSON.parse(builtManifestSource);

  assert.match(builtIndex, new RegExp(escapeRegExp(`./styles.css?v=${version}`)));
  assert.match(builtIndex, new RegExp(escapeRegExp(`./app.js?v=${version}`)));
  assert.match(
    builtStyles,
    new RegExp(escapeRegExp(`./assets/fonts/noto-serif-kr-korean-wght-normal.woff2?v=${version}`))
  );
  assert.match(builtApp, new RegExp(escapeRegExp(`./lib/dictionary-logic.js?v=${version}`)));
  assert.match(builtApp, new RegExp(escapeRegExp(`./data/words.json?v=${version}`)));
  assert.match(builtOfflineStatus, /serviceWorker\.register\("\.\/sw\.js"\)/);
  assert.doesNotMatch(builtOfflineStatus, /sw\.js\?v=/);
  assert.equal(builtManifest.start_url, "./");
  assert.deepEqual(
    builtManifest.icons.map((icon) => icon.src),
    [
      `./assets/icon-192.png?v=${version}`,
      `./assets/icon-512.png?v=${version}`
    ]
  );
  assert.equal(builtManifestSource.includes("__ASSET_VERSION__"), false);
  assert.equal(builtManifestSource.includes("__CACHE_VERSION__"), false);
  assert.equal(builtSw.includes("__ASSET_VERSION__"), false);
  assert.equal(builtSw.includes("__CACHE_VERSION__"), false);

  const pinnedVersions = new Set();
  for (const relativePath of [
    "index.html",
    "styles.css",
    ...PRECACHE_RUNTIME_MODULES.filter((modulePath) => modulePath !== "sw.js")
  ]) {
    const source = fs.readFileSync(path.join(outputRoot, relativePath), "utf8");
    for (const match of source.matchAll(/[?&]v=([^"'\s)#]+)/g)) {
      pinnedVersions.add(match[1]);
    }
  }

  assert.deepEqual([...pinnedVersions], [version]);
});

test("cache version changes when a precached static asset changes", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cache-version-"));
  createFixtureProject(tempRoot);

  const initialVersion = generateCacheVersion(tempRoot);
  writeFile(tempRoot, "assets/icon.svg", "<svg><title>updated</title></svg>");

  assert.notEqual(generateCacheVersion(tempRoot), initialVersion);
});

test("cache version distinguishes invalid UTF-8 bytes in precached binary assets", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cache-version-"));
  createFixtureProject(tempRoot);
  const fontPath = path.join(tempRoot, "assets/fonts/noto-serif-kr-korean-wght-normal.woff2");

  // Both bytes decode to the replacement character, which previously produced the same digest input.
  fs.writeFileSync(fontPath, Buffer.from([0x80]));
  const initialVersion = generateCacheVersion(tempRoot);
  assert.equal(fs.readFileSync(fontPath, "utf8"), "\uFFFD");

  fs.writeFileSync(fontPath, Buffer.from([0x81]));
  assert.equal(fs.readFileSync(fontPath, "utf8"), "\uFFFD");
  const changedVersion = generateCacheVersion(tempRoot);

  assert.notEqual(changedVersion, initialVersion);
  assert.equal(generateCacheVersion(tempRoot), changedVersion);
});

test("cache version tracks build transformation inputs and remains deterministic when unchanged", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cache-version-"));
  createFixtureProject(tempRoot);

  const initialVersion = generateCacheVersion(tempRoot);
  assert.equal(generateCacheVersion(tempRoot), initialVersion);

  execFileSync("node", ["scripts/build-pages.mjs"], {
    cwd: tempRoot,
    encoding: "utf8"
  });
  const firstBuild = fs.readFileSync(path.join(tempRoot, "dist-pages", "sw.js"), "utf8");

  execFileSync("node", ["scripts/build-pages.mjs"], {
    cwd: tempRoot,
    encoding: "utf8"
  });
  assert.equal(fs.readFileSync(path.join(tempRoot, "dist-pages", "sw.js"), "utf8"), firstBuild);

  const buildScriptPath = path.join(tempRoot, "scripts", "build-pages.mjs");
  fs.appendFileSync(buildScriptPath, "\n// changed release transformation\n");

  assert.notEqual(generateCacheVersion(tempRoot), initialVersion);
});

test("build-pages versions every relative importScripts literal while preserving external literals", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "build-pages-"));
  createFixtureProject(tempRoot);
  writeFile(
    tempRoot,
    "sw.js",
    'importScripts("./lib/service-worker-routing.js", "./lib/extra-worker.js", "https://cdn.example.com/worker.js");'
  );
  writeFile(tempRoot, "lib/extra-worker.js", "self.extraWorker = true;");

  execFileSync("node", ["scripts/build-pages.mjs"], {
    cwd: tempRoot,
    encoding: "utf8"
  });

  const version = generateCacheVersion(tempRoot);
  const builtSw = fs.readFileSync(path.join(tempRoot, "dist-pages", "sw.js"), "utf8");

  assert.match(builtSw, new RegExp(escapeRegExp(`./lib/service-worker-routing.js?v=${version}`)));
  assert.match(builtSw, new RegExp(escapeRegExp(`./lib/extra-worker.js?v=${version}`)));
  assert.match(builtSw, /https:\/\/cdn\.example\.com\/worker\.js/);
});

test("cache version changes when a transitive runtime module changes", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cache-version-"));
  createFixtureProject(tempRoot);
  writeFile(tempRoot, "app.js", `${APP_SOURCE}\nimport "./lib/runtime-parent.js";`);
  writeFile(tempRoot, "lib/runtime-parent.js", 'import "./transitive-runtime.js";');
  writeFile(tempRoot, "lib/transitive-runtime.js", "export const fixtureModule = true;");

  const initialVersion = generateCacheVersion(tempRoot);
  writeFile(tempRoot, "lib/transitive-runtime.js", "export const fixtureModule = 'updated';");

  assert.notEqual(generateCacheVersion(tempRoot), initialVersion);
});

test("cache version tracks the offline readiness module through the runtime closure", () => {
  assert.equal(RUNTIME_MODULES.includes("lib/offline-status.js"), true);

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cache-version-"));
  createFixtureProject(tempRoot);
  const initialVersion = generateCacheVersion(tempRoot);
  writeFile(tempRoot, "lib/offline-status.js", "export const status = 'updated';");

  assert.notEqual(generateCacheVersion(tempRoot), initialVersion);
});

test("cache version tracks the startup coordinator through the runtime closure", () => {
  assert.equal(RUNTIME_MODULES.includes("lib/app-startup.js"), true);

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cache-version-"));
  createFixtureProject(tempRoot);
  const initialVersion = generateCacheVersion(tempRoot);
  writeFile(tempRoot, "lib/app-startup.js", "export const startup = 'updated';");

  assert.notEqual(generateCacheVersion(tempRoot), initialVersion);
});
