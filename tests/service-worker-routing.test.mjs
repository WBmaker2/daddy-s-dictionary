import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const TEST_DIR = fileURLToPath(new URL(".", import.meta.url));
const ROOT = path.resolve(TEST_DIR, "..");
const ROUTING_MODULE_PATH = path.join(ROOT, "lib", "service-worker-routing.js");
const SERVICE_WORKER_ENTRY_PATH = path.join(ROOT, "sw.js");
const REQUIRED_RUNTIME_MODULES = [
  "./lib/dom-contract.js",
  "./lib/dictionary-logic.js",
  "./lib/pronunciation-controls.js",
  "./lib/service-worker-routing.js"
];

function loadRoutingModule() {
  const source = fs.readFileSync(ROUTING_MODULE_PATH, "utf8");
  const context = {
    globalThis: {},
    self: {},
    URL
  };

  context.globalThis = context;
  context.self = context;

  vm.runInNewContext(source, context, {
    filename: ROUTING_MODULE_PATH
  });

  return context.ServiceWorkerRouting;
}

function toPlainObject(value) {
  return JSON.parse(JSON.stringify(value));
}

function createBasicResponse(body, init = {}) {
  const response = new Response(body, init);
  Object.defineProperty(response, "type", { value: "basic" });
  return response;
}

function readServiceWorkerAssetList(source, constName) {
  const match = source.match(new RegExp(`const\\s+${constName}\\s*=\\s*(\\[[\\s\\S]*?\\]);`));
  assert.ok(match, `Expected ${constName} to be declared as an array literal`);

  return vm.runInNewContext(match[1], {}, {
    filename: `${SERVICE_WORKER_ENTRY_PATH}:${constName}`
  });
}

function createServiceWorkerHarness(entryPath, options = {}) {
  const source = fs.readFileSync(entryPath, "utf8");
  const listeners = new Map();
  const cacheEntries = new Map();
  const openedCaches = [];
  const scopeUrl = options.scopeUrl ?? "https://example.com/";

  function resolveCacheKey(requestOrPath) {
    if (typeof requestOrPath === "string") {
      return new URL(requestOrPath, scopeUrl).href;
    }

    return requestOrPath.url;
  }

  async function fetchMock(requestOrPath) {
    const url = resolveCacheKey(requestOrPath);

    if (options.fetch) {
      return options.fetch(url);
    }

    throw new Error("network unavailable");
  }

  const context = {
    URL,
    caches: {
      async match(requestOrPath) {
        const key = resolveCacheKey(requestOrPath);
        return cacheEntries.get(key);
      },
      async open(name) {
        openedCaches.push(name);
        const cache = {
          async add(requestOrPath) {
            const response = await fetchMock(requestOrPath);

            if (!response.ok) {
              throw new Error(`Failed to cache ${resolveCacheKey(requestOrPath)}: ${response.status}`);
            }

            cacheEntries.set(resolveCacheKey(requestOrPath), response.clone());
          },
          async addAll(requests) {
            await Promise.all(requests.map((request) => cache.add(request)));
          },
          async put(request, response) {
            if (options.cachePut) {
              await options.cachePut(resolveCacheKey(request), response);
              return;
            }

            cacheEntries.set(resolveCacheKey(request), response);
          }
        };

        return {
          add: cache.add,
          addAll: cache.addAll,
          put: cache.put
        };
      },
      async keys() {
        return [];
      },
      async delete() {
        return true;
      }
    },
    fetch: fetchMock,
    Response,
    console: options.console ?? console,
    globalThis: {},
    self: {
      location: { href: scopeUrl, origin: new URL(scopeUrl).origin },
      registration: { scope: scopeUrl },
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
  context.self.self = context.self;
  context.importScripts = (...scriptPaths) => {
    for (const scriptPath of scriptPaths) {
      const importedPath = path.resolve(path.dirname(entryPath), scriptPath);
      const importedSource = fs.readFileSync(importedPath, "utf8");
      vm.runInNewContext(importedSource, context, { filename: importedPath });
    }
  };

  vm.runInNewContext(source, context, { filename: entryPath });

  return {
    listeners,
    cacheEntries,
    openedCaches
  };
}

async function dispatchInstall(harness) {
  const installHandler = harness.listeners.get("install");
  assert.equal(typeof installHandler, "function");

  let installPromise = null;
  installHandler({
    waitUntil(value) {
      installPromise = Promise.resolve(value);
    }
  });

  assert.ok(installPromise);
  return installPromise;
}

async function dispatchFetch(harness, request) {
  const fetchHandler = harness.listeners.get("fetch");
  assert.equal(typeof fetchHandler, "function");

  let responsePromise = null;
  fetchHandler({
    request,
    respondWith(value) {
      responsePromise = value;
    }
  });

  assert.ok(responsePromise);
  return responsePromise;
}

test("sw.js precaches runtime modules imported by app.js", () => {
  const source = fs.readFileSync(SERVICE_WORKER_ENTRY_PATH, "utf8");
  const requiredAssets = readServiceWorkerAssetList(source, "REQUIRED_ASSETS");

  for (const modulePath of REQUIRED_RUNTIME_MODULES) {
    assert.equal(
      requiredAssets.includes(modulePath),
      true,
      `${modulePath} must stay in REQUIRED_ASSETS so offline install fails loudly if it is missing`
    );
  }
});

test("service worker routing classifies document navigations with app-shell fallback", () => {
  const routing = loadRoutingModule();
  const assetPaths = routing.buildAssetPathSet(["./", "./index.html", "./app.js"], "https://example.com");
  const strategy = routing.resolveRequestStrategy({
    method: "GET",
    mode: "navigate",
    destination: "document",
    url: "https://example.com/search?q=teacher",
    scopeOrigin: "https://example.com",
    assetPaths
  });

  assert.deepEqual(toPlainObject(strategy), {
    type: "document",
    fallback: "app-shell"
  });
});

test("service worker routing treats precached app shell assets as cache-first resources", () => {
  const routing = loadRoutingModule();
  const assetPaths = routing.buildAssetPathSet(
    ["./", "./index.html", "./styles.css", "./app.js", "./assets/icon-192.png"],
    "https://example.com"
  );
  const strategy = routing.resolveRequestStrategy({
    method: "GET",
    mode: "same-origin",
    destination: "script",
    url: "https://example.com/app.js",
    scopeOrigin: "https://example.com",
    assetPaths
  });

  assert.deepEqual(toPlainObject(strategy), {
    type: "asset",
    fallback: "cache-only"
  });
});

test("service worker routing resolves asset paths from the service worker scope", () => {
  const routing = loadRoutingModule();
  const assetPaths = routing.buildAssetPathSet(
    ["./", "./index.html", "./app.js", "./assets/icon-192.png"],
    "https://example.com/dictionary/"
  );

  assert.equal(assetPaths.has("/dictionary"), true);
  assert.equal(assetPaths.has("/dictionary/index.html"), true);
  assert.equal(assetPaths.has("/dictionary/app.js"), true);
  assert.equal(assetPaths.has("/app.js"), false);

  assert.deepEqual(
    toPlainObject(
      routing.resolveRequestStrategy({
        method: "GET",
        mode: "same-origin",
        destination: "script",
        url: "https://example.com/dictionary/app.js",
        scopeOrigin: "https://example.com/dictionary/",
        assetPaths
      })
    ),
    {
      type: "asset",
      fallback: "cache-only"
    }
  );

  assert.deepEqual(
    toPlainObject(
      routing.resolveRequestStrategy({
        method: "GET",
        mode: "same-origin",
        destination: "script",
        url: "https://example.com/app.js",
        scopeOrigin: "https://example.com/dictionary/",
        assetPaths
      })
    ),
    {
      type: "ignore",
      fallback: "none"
    }
  );
});

test("service worker routing treats same-origin JSON as data with cache fallback only", () => {
  const routing = loadRoutingModule();
  const strategy = routing.resolveRequestStrategy({
    method: "GET",
    mode: "same-origin",
    destination: "",
    url: "https://example.com/data/words.json",
    scopeOrigin: "https://example.com",
    assetPaths: new Set()
  });

  assert.deepEqual(toPlainObject(strategy), {
    type: "data",
    fallback: "cache-only"
  });
});

test("service worker routing ignores requests that should not receive app-shell fallback", () => {
  const routing = loadRoutingModule();
  const assetPaths = routing.buildAssetPathSet(["./index.html", "./app.js"], "https://example.com");

  assert.deepEqual(
    toPlainObject(
      routing.resolveRequestStrategy({
        method: "GET",
        mode: "cors",
        destination: "script",
        url: "https://cdn.example.com/app.js",
        scopeOrigin: "https://example.com",
        assetPaths
      })
    ),
    {
      type: "ignore",
      fallback: "none"
    }
  );

  assert.deepEqual(
    toPlainObject(
      routing.resolveRequestStrategy({
        method: "HEAD",
        mode: "navigate",
        destination: "document",
        url: "https://example.com/",
        scopeOrigin: "https://example.com",
        assetPaths
      })
    ),
    {
      type: "ignore",
      fallback: "none"
    }
  );
});

test("service worker routing only caches successful same-origin basic responses", () => {
  const routing = loadRoutingModule();

  assert.equal(routing.shouldCacheResponse({ ok: true, type: "basic" }), true);
  assert.equal(routing.shouldCacheResponse({ ok: false, type: "basic" }), false);
  assert.equal(routing.shouldCacheResponse({ ok: true, type: "cors" }), false);
});

test("sw.js entrypoint wires the fetch handler to return cached JSON data when offline", async () => {
  const harness = createServiceWorkerHarness(SERVICE_WORKER_ENTRY_PATH);
  const cachedResponse = new Response('{"words":[]}', {
    headers: { "content-type": "application/json" }
  });

  harness.cacheEntries.set("https://example.com/data/words.json", cachedResponse);

  const response = await dispatchFetch(harness, {
    method: "GET",
    mode: "same-origin",
    destination: "",
    url: "https://example.com/data/words.json"
  });

  assert.equal(await response.text(), '{"words":[]}');
});

test("sw.js returns a 404 fallback for uncached optional JSON data when offline", async () => {
  const harness = createServiceWorkerHarness(SERVICE_WORKER_ENTRY_PATH);

  const response = await dispatchFetch(harness, {
    method: "GET",
    mode: "same-origin",
    destination: "",
    url: "https://example.com/data/supplemental-words.json"
  });

  assert.equal(response.status, 404);
});

test("sw.js still returns network assets when runtime cache writes fail", async () => {
  const harness = createServiceWorkerHarness(SERVICE_WORKER_ENTRY_PATH, {
    console: { error: console.error, info: console.info, log: console.log, warn() {} },
    cachePut() {
      throw new Error("quota exceeded");
    },
    fetch() {
      return createBasicResponse("console.log('fresh');", {
        status: 200,
        headers: { "content-type": "text/javascript" }
      });
    }
  });

  const response = await dispatchFetch(harness, {
    method: "GET",
    mode: "same-origin",
    destination: "script",
    url: "https://example.com/extra-module.js"
  });

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "console.log('fresh');");
});

test("sw.js still returns network data when runtime cache writes fail", async () => {
  const harness = createServiceWorkerHarness(SERVICE_WORKER_ENTRY_PATH, {
    console: { error: console.error, info: console.info, log: console.log, warn() {} },
    cachePut() {
      throw new Error("quota exceeded");
    },
    fetch() {
      return createBasicResponse('{"words":[{"word":"fresh"}]}', {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }
  });

  const response = await dispatchFetch(harness, {
    method: "GET",
    mode: "same-origin",
    destination: "",
    url: "https://example.com/data/words.json"
  });

  assert.equal(response.status, 200);
  assert.equal(await response.text(), '{"words":[{"word":"fresh"}]}');
});

test("sw.js install continues when an optional precache asset fails", async () => {
  const harness = createServiceWorkerHarness(SERVICE_WORKER_ENTRY_PATH, {
    console: { error: console.error, info: console.info, log: console.log, warn() {} },
    fetch(url) {
      if (url.endsWith("/data/supplemental-words.json")) {
        return new Response("missing", { status: 404 });
      }

      return new Response("ok", { status: 200 });
    }
  });

  await assert.doesNotReject(dispatchInstall(harness));
});

test("sw.js install fails when a required precache asset fails", async () => {
  const harness = createServiceWorkerHarness(SERVICE_WORKER_ENTRY_PATH, {
    fetch(url) {
      if (url.endsWith("/app.js")) {
        return new Response("missing", { status: 404 });
      }

      return new Response("ok", { status: 200 });
    }
  });

  await assert.rejects(dispatchInstall(harness), /Failed to cache/);
});
