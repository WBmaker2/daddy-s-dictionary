importScripts("./lib/service-worker-routing.js");

const CACHE_VERSION = "__CACHE_VERSION__";
const CACHE_FALLBACK_VERSION = "dev";
const IS_LOCAL_CACHE_VERSION = CACHE_VERSION.startsWith("__") && CACHE_VERSION.endsWith("__");
const CACHE_NAME = `daddys-dictionary-${IS_LOCAL_CACHE_VERSION ? CACHE_FALLBACK_VERSION : CACHE_VERSION}`;
const REQUIRED_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./assets/icon.svg",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./lib/dom-contract.js",
  "./lib/dictionary-logic.js",
  "./lib/pronunciation-controls.js",
  "./lib/service-worker-routing.js",
  "./data/words.json"
];
const OPTIONAL_ASSETS = [
  "./data/supplemental-words.json",
  "./data/textbook-expressions.json",
  "./data/example-sentences.json"
];
const PRECACHE_ASSETS = [...REQUIRED_ASSETS, ...OPTIONAL_ASSETS];
const OFFLINE_DOCUMENT = "./index.html";
const { buildAssetPathSet, resolveRequestStrategy, shouldCacheResponse } = self.ServiceWorkerRouting;
const SCOPE_URL = self.registration?.scope || new URL("./", self.location.href).href;
const ASSET_PATHS = buildAssetPathSet(PRECACHE_ASSETS, SCOPE_URL);
const OPTIONAL_ASSET_PATHS = buildAssetPathSet(OPTIONAL_ASSETS, SCOPE_URL);

async function putInCache(request, response) {
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
}

function queueCachePut(request, response) {
  putInCache(request, response).catch((error) => {
    console.warn("Skipped runtime cache update", error);
  });
}

function isOptionalDataRequest(request) {
  return OPTIONAL_ASSET_PATHS.has(new URL(request.url, SCOPE_URL).pathname);
}

async function handleDocumentRequest(request) {
  try {
    return await fetch(request);
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    const appShell = await caches.match(OFFLINE_DOCUMENT);
    if (appShell) {
      return appShell;
    }

    throw error;
  }
}

async function handleAssetRequest(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (shouldCacheResponse(response)) {
    queueCachePut(request, response);
  }

  return response;
}

async function handleDataRequest(request, { optional = false } = {}) {
  try {
    const response = await fetch(request);

    if (shouldCacheResponse(response)) {
      queueCachePut(request, response);
    }

    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    if (optional) {
      return new Response("", {
        status: 404,
        statusText: "Optional data unavailable"
      });
    }

    throw error;
  }
}

async function precacheAssets() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(REQUIRED_ASSETS);

  await Promise.all(
    OPTIONAL_ASSETS.map(async (asset) => {
      try {
        await cache.add(asset);
      } catch (error) {
        console.warn(`Skipped optional precache asset: ${asset}`, error);
      }
    })
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheAssets());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const strategy = resolveRequestStrategy({
    method: event.request.method,
    mode: event.request.mode,
    destination: event.request.destination,
    url: event.request.url,
    scopeOrigin: SCOPE_URL,
    assetPaths: ASSET_PATHS
  });

  if (strategy.type === "ignore") {
    return;
  }

  if (strategy.type === "document") {
    event.respondWith(handleDocumentRequest(event.request));
    return;
  }

  if (strategy.type === "asset") {
    event.respondWith(handleAssetRequest(event.request));
    return;
  }

  event.respondWith(handleDataRequest(event.request, { optional: isOptionalDataRequest(event.request) }));
});
