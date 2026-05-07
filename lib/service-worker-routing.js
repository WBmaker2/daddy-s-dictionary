(function attachServiceWorkerRouting(global) {
  "use strict";

  const ASSET_DESTINATIONS = new Set(["script", "style", "image", "font", "manifest", "worker"]);

  function normalizePathname(pathname) {
    if (!pathname) {
      return "/";
    }

    if (pathname.length > 1 && pathname.endsWith("/")) {
      return pathname.slice(0, -1);
    }

    return pathname;
  }

  function normalizeScopePathname(pathname) {
    if (!pathname || pathname === "/") {
      return "/";
    }

    return pathname.endsWith("/") ? pathname : `${pathname}/`;
  }

  function isPathnameWithinScope(pathname, scopePathname) {
    if (scopePathname === "/") {
      return true;
    }

    const scopeRootPathname = normalizePathname(scopePathname);
    return pathname === scopeRootPathname || pathname.startsWith(scopePathname);
  }

  function buildAssetPathSet(assetUrls, scopeUrl) {
    const assetPaths = new Set();
    const normalizedScopeRoot = normalizePathname(new URL("./", scopeUrl).pathname);
    const normalizedIndexPath = normalizePathname(new URL("./index.html", scopeUrl).pathname);

    for (const assetUrl of assetUrls) {
      const pathname = normalizePathname(new URL(assetUrl, scopeUrl).pathname);
      assetPaths.add(pathname);

      if (pathname === normalizedIndexPath) {
        assetPaths.add(normalizedScopeRoot);
      }
    }

    return assetPaths;
  }

  function resolveRequestStrategy({
    method,
    mode,
    destination,
    url,
    scopeOrigin,
    assetPaths
  }) {
    if (method !== "GET") {
      return { type: "ignore", fallback: "none" };
    }

    const scopeUrl = new URL(scopeOrigin);
    const scopePathname = normalizeScopePathname(scopeUrl.pathname);
    const requestUrl = new URL(url, scopeUrl);

    if (requestUrl.origin !== scopeUrl.origin) {
      return { type: "ignore", fallback: "none" };
    }

    const pathname = normalizePathname(requestUrl.pathname);

    if (!isPathnameWithinScope(pathname, scopePathname)) {
      return { type: "ignore", fallback: "none" };
    }

    if (mode === "navigate" || destination === "document") {
      return { type: "document", fallback: "app-shell" };
    }

    if (pathname.endsWith(".json")) {
      return { type: "data", fallback: "cache-only" };
    }

    if ((assetPaths && assetPaths.has(pathname)) || ASSET_DESTINATIONS.has(destination)) {
      return { type: "asset", fallback: "cache-only" };
    }

    return { type: "ignore", fallback: "none" };
  }

  function shouldCacheResponse(response) {
    return Boolean(response && response.ok && response.type === "basic");
  }

  global.ServiceWorkerRouting = {
    buildAssetPathSet,
    resolveRequestStrategy,
    shouldCacheResponse
  };
})(typeof self !== "undefined" ? self : globalThis);
