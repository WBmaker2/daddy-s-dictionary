# PWA Data Quality Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the dictionary PWA safer offline, more reliable across deployment paths, and better protected against data/search quality regressions.

**Architecture:** Keep the static PWA architecture and the existing module split. Harden shared contracts around service worker assets, data validation, browser DOM assumptions, and test discovery without introducing a build framework.

**Tech Stack:** Vanilla HTML/CSS/ES modules, Node test runner, static service worker, JSON data pipeline, Python supplemental importer.

---

## Current Baseline

- Branch: `codex/priority-1-data-validation`
- Existing verification passes: `npm run test:data`, `npm run check:data`, `npm run build:pages`, `node --check app.js`, `node --check sw.js`
- Important context: the worktree already contains earlier uncommitted improvements that extracted `lib/dictionary-logic.js`, `lib/pronunciation-controls.js`, `lib/service-worker-routing.js`, and data validation tests.

## File Map

- Modify `sw.js`: align precache assets with runtime module imports, split required/optional asset install behavior, use deployment scope when classifying assets, and consume a generated cache version.
- Modify `lib/service-worker-routing.js`: resolve asset paths relative to service worker scope, not only origin.
- Modify `tests/service-worker-routing.test.mjs`: cover subpath scope routing and runtime module cache behavior.
- Modify `tests/build-pages.test.mjs`: assert built service worker can import helper and built output includes required runtime modules.
- Modify `scripts/build-pages.mjs`: generate or inject a cache version artifact into built `sw.js`.
- Create `scripts/generate-cache-version.mjs` or add focused helpers under `scripts/`: compute deterministic cache version from `package.json` plus relevant asset contents.
- Modify `scripts/data-validation.mjs`: add release-quality checks for example sentence coverage and search keyword invariants.
- Modify `tests/check-data.test.mjs`: add failing tests for strict example coverage policy and search keyword invariants.
- Create `tests/search-quality.test.mjs`: add golden query regression tests against committed data.
- Modify `app.js`: add DOM reference assertions during startup.
- Modify `package.json`: switch `test:data` to automatic test discovery if feasible.
- Modify `tests/check-data-cli.test.mjs`: update script-wiring assertions after test discovery changes.
- Modify `README.md`: document the new PWA/data quality release gate.

---

### Task 1: Service Worker Offline Contract

**Files:**
- Modify: `sw.js`
- Modify: `lib/service-worker-routing.js`
- Modify: `tests/service-worker-routing.test.mjs`
- Modify: `tests/build-pages.test.mjs`

- [x] **Step 1: Write failing tests for required runtime modules**

Add tests proving the service worker precache list includes:

```js
[
  "./lib/dictionary-logic.js",
  "./lib/pronunciation-controls.js",
  "./lib/service-worker-routing.js"
]
```

Run: `node --test tests/service-worker-routing.test.mjs tests/build-pages.test.mjs`

Expected: FAIL because the imported runtime modules are not all in `ASSETS`.

- [x] **Step 2: Write failing tests for subpath scope routing**

Add a routing test where scope is `https://example.com/dictionary/` and `./app.js` resolves to `/dictionary/app.js`, not `/app.js`.
Also add a same-origin but out-of-scope request such as `https://example.com/app.js`; it should not be treated as a precached asset for a `/dictionary/` deployment.

Run: `node --test tests/service-worker-routing.test.mjs`

Expected: FAIL because the current helper receives origin only.

- [x] **Step 3: Implement scope-aware asset path building**

Update `buildAssetPathSet(assetUrls, scopeUrl)` to resolve assets against a full scope URL. In `sw.js`, use `self.registration.scope` when available and fall back to `self.location.href`.

- [x] **Step 4: Split required and optional precache**

Keep core runtime files required:

```js
const REQUIRED_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./assets/icon.svg",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./lib/dictionary-logic.js",
  "./lib/pronunciation-controls.js",
  "./lib/service-worker-routing.js",
  "./data/words.json"
];
```

Keep optional data files best-effort:

```js
const OPTIONAL_ASSETS = [
  "./data/supplemental-words.json",
  "./data/textbook-expressions.json",
  "./data/example-sentences.json"
];
```

Install should fail for required files and continue when optional files are missing.
Add a service worker harness test that triggers the `install` listener with one optional fetch failure and verifies the install promise still resolves. Add a separate test where a required asset fetch fails and verifies install rejects.

- [x] **Step 5: Verify Task 1**

Run:

```bash
node --test tests/service-worker-routing.test.mjs tests/build-pages.test.mjs
npm run test:data
npm run build:pages
node --check sw.js
node --check lib/service-worker-routing.js
```

Expected: all commands pass.

---

### Task 2: Deterministic Cache Versioning

**Files:**
- Modify: `scripts/build-pages.mjs`
- Modify: `sw.js`
- Create or Modify: `scripts/generate-cache-version.mjs`
- Modify: `tests/build-pages.test.mjs`

- [x] **Step 1: Write failing build test for cache version injection**

Add a test that runs `scripts/build-pages.mjs` in a fixture and asserts built `dist-pages/sw.js` does not contain a raw placeholder such as `__CACHE_VERSION__` and does contain a deterministic cache name.

Run: `node --test tests/build-pages.test.mjs`

Expected: FAIL until build injects the version.

- [x] **Step 2: Implement cache version generation**

Compute a stable version from:

- `package.json` version
- core runtime file contents
- committed JSON data file contents that exist

Keep the source `sw.js` readable with a placeholder constant and a fixed local fallback:

```js
const CACHE_VERSION = "__CACHE_VERSION__";
const CACHE_FALLBACK_VERSION = "dev";
const IS_LOCAL_CACHE_VERSION = CACHE_VERSION.startsWith("__") && CACHE_VERSION.endsWith("__");
const CACHE_NAME = `daddys-dictionary-${IS_LOCAL_CACHE_VERSION ? CACHE_FALLBACK_VERSION : CACHE_VERSION}`;
```

The build script replaces the placeholder in `dist-pages/sw.js`. Local dev uses the explicit `dev` fallback because the service worker cannot read `package.json` at runtime.

- [x] **Step 3: Verify cache version behavior**

Run:

```bash
node --test tests/build-pages.test.mjs
npm run build:pages
! rg "__CACHE_VERSION__" dist-pages/sw.js
```

Expected: tests pass, build passes, `rg` finds no placeholder in `dist-pages/sw.js`.

---

### Task 3: Data Quality Gates

**Files:**
- Modify: `scripts/data-validation.mjs`
- Modify: `tests/check-data.test.mjs`
- Create: `tests/search-quality.test.mjs`
- Modify: `README.md`

- [x] **Step 1: Write failing strict coverage test**

Add a test that strict mode can enforce minimum example coverage by category.

Initial policy:

```js
{
  base: 1.0,
  supplemental: 0.5,
  textbookExpressions: 0
}
```

This preserves current data while making the rule explicit.

- [x] **Step 2: Implement coverage summary and validation**

Add `exampleCoverage` to `validateDataSet()` summary and support `options.exampleCoverageThresholds`.

Strict repository check should apply the default thresholds. Partial mode should report summary without failing on missing optional files.

- [x] **Step 3: Write failing search keyword invariant tests**

Require each merged word to have normalized `word` and `forms` in `searchKeywords.english`, and at least one normalized Korean gloss or definition in `searchKeywords.korean`.

- [x] **Step 4: Implement search keyword validation**

Extend `validateWordEntries()` or a focused helper to check the invariants without overfitting to generated wording.

- [x] **Step 5: Add golden query regression tests**

Create `tests/search-quality.test.mjs` with committed data queries such as:

```js
[
  { query: "abandon", expectedFirst: "abandon" },
  { query: "버리다", expectedIncludes: "abandon" },
  { query: "방과", expectedIncludesCategory: "elementary-expressions" },
  { query: "bank", expectedFirst: "bank" }
]
```

- [x] **Step 6: Verify Task 3**

Run:

```bash
npm run test:data
npm run check:data
npm run check:data:partial
```

Expected: all commands pass with coverage summary available.

---

### Task 4: DOM Startup Contract

**Files:**
- Modify: `app.js`
- Create or Modify: `tests/app-dom-contract.test.mjs`
- Modify: `package.json`

- [x] **Step 1: Write failing DOM contract test**

Extract DOM ref creation into a testable helper or add a small exported function from a new module, then test that missing required selectors produce a clear error naming the missing id/class.

- [x] **Step 2: Implement explicit ref assertions**

Add a helper such as:

```js
function requireElement(selector, root = document) {
  const element = root.querySelector(selector);
  if (!element) {
    throw new Error(`Missing required DOM element: ${selector}`);
  }
  return element;
}
```

Use it for required refs and template subnodes.

- [x] **Step 3: Verify Task 4**

Run:

```bash
node --test tests/app-dom-contract.test.mjs
npm run test:data
node --check app.js
```

Expected: all commands pass.

---

### Task 5: Test Discovery and Release Gate Cleanup

**Files:**
- Modify: `package.json`
- Modify: `tests/check-data-cli.test.mjs`
- Modify: `README.md`

- [x] **Step 1: Write failing script-wiring test**

Update `tests/check-data-cli.test.mjs` to expect automatic discovery:

```json
"test:data": "node --test"
```

Run: `node --test tests/check-data-cli.test.mjs`

Expected: FAIL until `package.json` is updated.

- [x] **Step 2: Update package script**

Change `test:data` to automatic discovery so new test files are picked up by default. Prefer `node --test` in this Node runtime because `node --test tests` tries to execute the directory itself.

- [x] **Step 3: Document release gate**

README should list the release gate:

```bash
npm run test:data
npm run check:data
npm run build:pages
node --check app.js
node --check sw.js
```

- [x] **Step 4: Final verification**

Run:

```bash
npm run test:data
npm run check:data
npm run check:data:partial
npm run build:pages
node --check app.js
node --check sw.js
node --check lib/dictionary-logic.js
node --check lib/pronunciation-controls.js
node --check lib/service-worker-routing.js
git status --short
```

Expected: all verification passes; only intentional files are changed.

---

## Rollback Notes

- Service worker changes are isolated to `sw.js`, `lib/service-worker-routing.js`, and build tests.
- Data quality changes should not rewrite `data/*.json`; they only validate current committed data.
- If cache version injection introduces build risk, keep runtime fallback in source `sw.js` so local dev still works.
- Build and release-gate changes may touch `scripts/build-pages.mjs`, a cache-version helper script, `package.json`, `tests/check-data-cli.test.mjs`, and `README.md`.
