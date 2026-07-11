import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const ROOT = path.resolve("dist-pages");
const PORT = 4173;
const LEGACY_INSTALL_PAGE = "<!doctype html><title>Legacy service worker fixture</title>";
const LEGACY_SERVICE_WORKER = `
const CACHE_NAME = "legacy-cache-first";
const STALE_ASSETS = {
  "app.js": "document.body.dataset.legacyApp = 'true';",
  "styles.css": "body { background: hotpink; }",
  "lib/dictionary-logic.js": "throw new Error('stale module');",
  "assets/fonts/noto-serif-kr-korean-wght-normal.woff2": "stale-font"
};
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        Object.entries(STALE_ASSETS).map(([url, body]) =>
          cache.put(new URL(url, self.registration.scope), new Response(body))
        )
      )
    )
  );
  self.skipWaiting();
});
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
`;

const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
  ".woff2": "font/woff2"
};

function send(response, status, body, headers = {}) {
  response.writeHead(status, headers);
  response.end(body);
}

http.createServer((request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  const releasePrefix = "/__test__/release/";

  if (requestUrl.pathname === `${releasePrefix}legacy-install.html`) {
    send(response, 200, LEGACY_INSTALL_PAGE, { "Content-Type": "text/html; charset=utf-8" });
    return;
  }

  if (requestUrl.pathname === `${releasePrefix}legacy-cache-sw.js`) {
    send(response, 200, LEGACY_SERVICE_WORKER, {
      "Content-Type": "text/javascript; charset=utf-8",
      "Service-Worker-Allowed": "/"
    });
    return;
  }

  const relativePath = requestUrl.pathname === "/"
    ? "index.html"
    : requestUrl.pathname.startsWith(releasePrefix)
      ? requestUrl.pathname.slice(releasePrefix.length) || "index.html"
      : requestUrl.pathname.slice(1);
  const filePath = path.resolve(ROOT, relativePath);
  if (!filePath.startsWith(`${ROOT}${path.sep}`) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    send(response, 404, "Not found", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  send(response, 200, fs.readFileSync(filePath), {
    "Content-Type": CONTENT_TYPES[path.extname(filePath)] ?? "application/octet-stream"
  });
}).listen(PORT, "127.0.0.1");
