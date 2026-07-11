# Dictionary Quality and UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make dictionary search exact and transparent, reduce first-screen and payload cost, harden optional-data recovery, improve example quality, and polish the responsive accessible UI.

**Architecture:** Keep the framework-free static PWA. Extend the pure dictionary module with ranked search metadata, let the UI page through that result set, and keep resilience and offline-state logic in focused modules. Preserve readable source data while generating compact deployment JSON, and protect all behavior with Node tests plus a small Playwright browser suite.

**Tech Stack:** HTML, CSS, ES modules, Node.js built-in test runner, service worker, Cloudflare Pages static output, Playwright test runner.

## Global Constraints

- 사용자에게 보이는 기본 언어는 한국어로 유지한다.
- 런타임 프레임워크나 백엔드를 추가하지 않는다.
- 기존 3,489개 데이터 ID와 카테고리 값은 바꾸지 않는다.
- 발음 듣기, 말하기 점검, 오프라인 검색 기능을 유지한다.
- 모든 동작 변경은 실패하는 테스트를 먼저 확인한 뒤 구현한다.
- 보조 데이터가 실패해도 필수 `data/words.json`의 3,000개 단어는 사용할 수 있어야 한다.
- 넓은 검색 결과는 실제 총 개수와 현재 표시 개수를 구분해 안내한다.
- 배포 대상은 `dist-pages/`이며 Cloudflare Pages 정적 배포 구조를 유지한다.
- 최종 버전은 `v1.1.0`으로 동기화한다.

---

### Task 1: Exact Search Ranking and Result Metadata

**Files:**
- Modify: `lib/dictionary-logic.js:148-207`
- Modify: `tests/app-logic.test.mjs:209-274`
- Modify: `tests/search-quality.test.mjs:34-62`

**Interfaces:**
- Produces: `searchWords({ words, rawQuery, category, offset, limit }) -> { items, total, shown, hasMore }`
- Preserves: `filterWords(options) -> Word[]` as a compatibility wrapper.

- [ ] **Step 1: Write failing exact-ranking and metadata tests**

Add tests that assert:

```js
const result = searchWords({
  words: committedWords,
  rawQuery: "유산",
  category: "all",
  offset: 0,
  limit: 2
});

assert.equal(result.items[0].word, "asset");
assert.equal(result.total, 3);
assert.equal(result.shown, 2);
assert.equal(result.hasMore, true);
```

Also assert that `searchWords(... rawQuery: "a", limit: 6)` reports a total greater than 60 while returning six items, and that exact alternate English forms such as `data`, `lab`, `media`, and `mom` beat prefix-only matches.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --test tests/app-logic.test.mjs tests/search-quality.test.mjs`

Expected: FAIL because `searchWords` is not exported and exact keyword matches are not scored separately.

- [ ] **Step 3: Implement ranked search metadata**

Use these score tiers:

```js
const SCORE = {
  primaryExact: 500,
  englishExact: 480,
  koreanExact: 460,
  englishPrefix: 320,
  koreanPrefix: 300,
  englishContains: 180,
  koreanContains: 160
};
```

Normalize each keyword before comparison. Build the complete ranked array before slicing, then return:

```js
{
  items: rankedWords.slice(offset, offset + limit),
  total: rankedWords.length,
  shown: Math.min(offset + limit, rankedWords.length),
  hasMore: offset + limit < rankedWords.length
}
```

Keep empty-query ordering by ascending ID. Make `filterWords` call `searchWords` and return only `.items`, preserving its existing default limit of 60.

- [ ] **Step 4: Verify GREEN and full search regressions**

Run: `node --test tests/app-logic.test.mjs tests/search-quality.test.mjs`

Expected: all focused tests pass with no warnings.

Run: `npm run test:data`

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/dictionary-logic.js tests/app-logic.test.mjs tests/search-quality.test.mjs
git commit -m "Fix exact search ranking and result counts"
```

### Task 2: Search-First Pagination and Compact Results

**Files:**
- Modify: `index.html:36-170`
- Modify: `app.js:10-311`
- Modify: `lib/dom-contract.js:11-83`
- Modify: `styles.css:174-665`
- Modify: `sw.js:7-27`
- Modify: `scripts/generate-cache-version.mjs:7-20`
- Modify: `tests/app-dom-contract.test.mjs`
- Modify: `tests/service-worker-routing.test.mjs`
- Modify: `tests/build-pages.test.mjs`
- Create: `tests/search-view-state.test.mjs`
- Create: `lib/search-view-state.js`

**Interfaces:**
- Consumes: Task 1 `searchWords` result metadata.
- Produces: `createSearchViewState({ initialLimit: 6, pageSize: 12 })` with `reset()`, `showMore()`, and `limit`.

- [ ] **Step 1: Write failing view-state and DOM contract tests**

Test the pure state helper:

```js
const state = createSearchViewState({ initialLimit: 6, pageSize: 12 });
assert.equal(state.limit, 6);
state.showMore();
assert.equal(state.limit, 18);
state.reset();
assert.equal(state.limit, 6);
```

Extend the DOM contract to require `#load-more-button`, and require the result count copy to support `총 N개 중 M개 표시`.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --test tests/search-view-state.test.mjs tests/app-dom-contract.test.mjs`

Expected: FAIL because the helper and load-more element do not exist.

- [ ] **Step 3: Implement paged rendering**

Use `initialLimit: 6` and `pageSize: 12`. Reset the limit whenever query or category changes. Render the first six deterministic browse cards when the query is empty. Set visible copy as:

```js
refs.resultCount.textContent = `총 ${result.total.toLocaleString("ko-KR")}개 중 ${result.shown.toLocaleString("ko-KR")}개 표시`;
```

For a query, announce `“유산” 검색 결과 총 3개 중 3개를 표시합니다.` Hide the load-more button when `hasMore` is false; otherwise label it `결과 12개 더 보기` and preserve its focus after expansion.

Change the all-category label to `전체 단어·표현`. If a word has no alternate form, hide `.word-forms` instead of repeating the long category description. Add `data-category` to badges for later visual styling.

Add `./lib/search-view-state.js` to required precache assets and cache-version runtime inputs. Extend the existing build and service-worker tests so an offline reload can resolve every module imported by `app.js`.

- [ ] **Step 4: Implement compact responsive controls**

Add a centered `.load-more-button`. On mobile keep the two card actions in two equal columns when at least 340px wide; fall back to one column below 320px. Remove per-card `backdrop-filter`; use an opaque paper background and a lighter shadow to reduce scrolling paint cost.

- [ ] **Step 5: Verify GREEN and build**

Run: `node --test tests/search-view-state.test.mjs tests/app-dom-contract.test.mjs tests/app-logic.test.mjs`

Expected: all focused tests pass.

Run: `npm run test:data && npm run build:pages`

Expected: tests and build pass.

- [ ] **Step 6: Commit**

```bash
git add index.html app.js styles.css sw.js scripts/generate-cache-version.mjs lib/dom-contract.js lib/search-view-state.js tests/app-dom-contract.test.mjs tests/search-view-state.test.mjs tests/service-worker-routing.test.mjs tests/build-pages.test.mjs
git commit -m "Add paged search-first result flow"
```

### Task 3: Example Corpus Quality and Complete Coverage

**Files:**
- Modify: `scripts/generate-example-sentences.mjs`
- Modify: `scripts/data-validation.mjs`
- Modify: `data/example-sentences.json`
- Modify: `app.js:104-171`
- Create: `scripts/example-quality.mjs`
- Create: `tests/example-quality.test.mjs`
- Modify: `tests/check-data.test.mjs`
- Modify: `tests/search-quality.test.mjs`

**Interfaces:**
- Produces: `normalizeExampleTemplate(word, sentence)` and `validateExampleQuality({ items, words, maxTemplateRatio })`.
- Changes strict coverage thresholds to `base: 1`, `supplemental: 1`, `textbookExpressions: 1`.

- [ ] **Step 1: Write failing quality and coverage tests**

Assert that the committed corpus has 3,489 non-empty examples, every ID is represented once, no normalized template exceeds 20%, and these exact examples are present:

```js
{
  do: "I do my homework after dinner.",
  bank: "She deposited her allowance in the bank.",
  version: "This is the latest version of the school guide.",
  zoo: "Our class saw giraffes at the zoo.",
  young: "The young bird is learning to fly."
}
```

The normalized template helper must replace the target word case-insensitively with `{word}` before counting.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --test tests/example-quality.test.mjs tests/check-data.test.mjs tests/search-quality.test.mjs`

Expected: FAIL because the corpus has 3,227 examples, the dominant template exceeds 20%, and textbook/supplemental expression entries are absent.

- [ ] **Step 3: Add deterministic, grammar-safe generation**

Load `data/textbook-expressions.json` and stop filtering expression-like supplemental entries. Add exact curated overrides for the five words above.

Complete the 16 ellipsis expressions using this map before generating a classroom-context sentence:

```js
const EXPRESSION_COMPLETIONS = {
  "Hello, I'm ...": "Hello, I'm Minjun.",
  "How often do you ...?": "How often do you exercise?",
  "Why don't you ...?": "Why don't you take a short break?",
  "I'd like to ...": "I'd like to order lunch.",
  "I'm curious about ...": "I'm curious about this experiment.",
  "I'm looking for ...": "I'm looking for the library.",
  "What are you going to do ...?": "What are you going to do this weekend?",
  "Do you have any plans for ...?": "Do you have any plans for summer vacation?",
  "I'd like to buy ...": "I'd like to buy this notebook.",
  "I'm going to have ...": "I'm going to have the salad.",
  "I'm interested in ...": "I'm interested in science.",
  "It is likely that ...": "It is likely that it will rain.",
  "I'd like to exchange ...": "I'd like to exchange this shirt.",
  "I'd like to get a refund ...": "I'd like to get a refund for this item.",
  "I suggest you ...": "I suggest you check the answer again.",
  "go with ...": "Go with the blue shirt."
};
```

For other expressions use the complete expression itself inside `During class, a student said, “…”`. Replace the single dominant noun/verb/adjective fallbacks with deterministic arrays selected by `entry.id % templates.length`; all templates must be grammatical even when the exact transitivity is unknown. Metalinguistic fallbacks must say they are word-use practice rather than pretending to demonstrate a meaning.

Use these exact fallback arrays, substituting the target for `{word}`:

```js
const NOUN_FALLBACKS = [
  'The word "{word}" appeared in today\'s reading.',
  'Our class discussed how to use "{word}".',
  'The teacher wrote "{word}" on the board.',
  'We looked up the meaning of "{word}".',
  'A student used "{word}" in a sentence.',
  'The lesson included the word "{word}".',
  'We compared "{word}" with a related word.',
  'Our group made a sentence with "{word}".'
];

const VERB_FALLBACKS = [
  'We practiced using the verb "{word}" in class.',
  'The teacher showed us how "{word}" works in a sentence.',
  'A student wrote a sentence with the verb "{word}".',
  'Our group checked how to use "{word}" correctly.',
  'The lesson compared "{word}" with a related verb.',
  'We found the verb "{word}" in today\'s reading.'
];

const ADJECTIVE_FALLBACKS = [
  'We practiced using the adjective "{word}" in class.',
  'The teacher used "{word}" to describe something.',
  'A student wrote a sentence with the adjective "{word}".',
  'Our group checked the meaning of "{word}".'
];
```

- [ ] **Step 4: Regenerate and validate data**

Run: `npm run generate:data:example-sentences`

Expected: generated stats report `total: 3489`, including `supplemental: 407`, `elementary-expressions: 50`, and `middle-expressions: 32`.

Update strict expected stats and thresholds. Make `app.js` show `활용 예문` for expression entries and `예시 문장` for single words.

- [ ] **Step 5: Verify GREEN**

Run: `node --test tests/example-quality.test.mjs tests/check-data.test.mjs tests/search-quality.test.mjs`

Expected: focused tests pass.

Run: `npm run check:data && npm run test:data`

Expected: strict data validation and all tests pass.

- [ ] **Step 6: Commit**

```bash
git add scripts/generate-example-sentences.mjs scripts/example-quality.mjs scripts/data-validation.mjs data/example-sentences.json app.js tests/example-quality.test.mjs tests/check-data.test.mjs tests/search-quality.test.mjs
git commit -m "Improve example quality and coverage"
```

### Task 4: Optional Data Resilience and User Recovery

**Files:**
- Modify: `lib/dictionary-logic.js:131-145`
- Modify: `app.js:84-102,281-311`
- Modify: `index.html:126-170`
- Modify: `styles.css`
- Modify: `sw.js:7-27`
- Modify: `scripts/generate-cache-version.mjs:7-20`
- Modify: `tests/service-worker-routing.test.mjs`
- Modify: `tests/build-pages.test.mjs`
- Modify: `tests/app-logic.test.mjs`
- Create: `lib/load-recovery.js`
- Create: `tests/load-recovery.test.mjs`

**Interfaces:**
- Extends: `loadDictionaryData({ files, loadFile, onOptionalError })`.
- Produces: `renderLoadFailure({ container, message, onRetry })`.

- [ ] **Step 1: Write failing optional-error and retry tests**

The previous task already proved optional loader exceptions return the base dictionary. Add a new failing test that the same failure calls `onOptionalError` with `{ path, error }`, while the existing required-base rejection test stays green. Test that `renderLoadFailure` creates Korean recovery copy and a `다시 시도` button whose click invokes `onRetry` once.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --test tests/app-logic.test.mjs tests/load-recovery.test.mjs`

Expected: FAIL because optional errors are not reported through a callback and the recovery helper does not exist.

- [ ] **Step 3: Report isolated optional loader failures**

Wrap each manifest entry with:

```js
async function loadManifestEntry(entry, loadFile, onOptionalError) {
  try {
    return await loadFile(entry.path, { optional: entry.optional ?? false });
  } catch (error) {
    if (!entry.optional) throw error;
    onOptionalError?.({ path: entry.path, error });
    return null;
  }
}
```

Collect optional warnings in `app.js` and display `일부 확장 자료를 불러오지 못했지만 기본 영단어 검색은 사용할 수 있습니다.` without blocking search.

- [ ] **Step 4: Replace the production failure state**

Remove the `npm run generate:data` instruction. Render `사전 데이터를 불러오지 못했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.` and a `다시 시도` button. Disable controls only while retrying, then re-enable them on success or failure. Avoid duplicate event bindings across retries.

Add `./lib/load-recovery.js` to required precache assets and cache-version runtime inputs, with corresponding offline module-closure tests.

- [ ] **Step 5: Verify GREEN and regressions**

Run: `node --test tests/app-logic.test.mjs tests/load-recovery.test.mjs`

Expected: focused tests pass.

Run: `npm run test:data && npm run build:pages`

Expected: all tests and build pass.

- [ ] **Step 6: Commit**

```bash
git add lib/dictionary-logic.js lib/load-recovery.js app.js index.html styles.css sw.js scripts/generate-cache-version.mjs tests/app-logic.test.mjs tests/load-recovery.test.mjs tests/service-worker-routing.test.mjs tests/build-pages.test.mjs
git commit -m "Keep base dictionary usable on optional failures"
```

### Task 5: Compact Deployment Data and Offline Readiness

**Files:**
- Modify: `scripts/build-pages.mjs`
- Modify: `scripts/generate-cache-version.mjs:7-20`
- Modify: `tests/build-pages.test.mjs`
- Create: `lib/offline-status.js`
- Create: `tests/offline-status.test.mjs`
- Modify: `app.js:269-303`
- Modify: `index.html:28-32`
- Modify: `sw.js:7-27`
- Modify: `tests/service-worker-routing.test.mjs`

**Interfaces:**
- Produces: deployment JSON minification in `dist-pages/data/*.json`.
- Produces: `trackOfflineReadiness({ navigatorObject, onStatus })` returning a readiness promise.

- [ ] **Step 1: Write failing build-size and readiness tests**

Assert that built JSON parses to the same object as source JSON, contains no indentation/newline formatting, and is smaller than the source fixture. Test offline status transitions `preparing -> ready`, `unsupported`, and `failed` with injected navigator objects.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --test tests/build-pages.test.mjs tests/offline-status.test.mjs`

Expected: FAIL because build copies JSON verbatim and the readiness module does not exist.

- [ ] **Step 3: Minify deployment JSON**

When `copyDirectory` encounters a `.json` file under `data/`, parse it and write `JSON.stringify(payload)` to the destination. Continue copying non-JSON assets byte-for-byte. Keep cache version generation based on source content so any data change still rotates the cache.

- [ ] **Step 4: Surface offline readiness**

Give the existing offline hero chip `id="offline-status-chip"`, `role="status"`, and `aria-live="polite"`. Use exact labels:

```js
{
  preparing: "오프라인 준비 중",
  ready: "오프라인 사용 준비됨",
  unsupported: "온라인에서 사용 가능",
  failed: "오프라인 준비 실패"
}
```

Register the service worker before dictionary loading begins and update the chip without blocking the core search bootstrap. Ensure `lib/offline-status.js` is included in the required service-worker precache list and cache-version runtime inputs.

- [ ] **Step 5: Verify GREEN and output size**

Run: `node --test tests/build-pages.test.mjs tests/offline-status.test.mjs tests/service-worker-routing.test.mjs`

Expected: focused tests pass.

Run: `npm run build:pages && du -h dist-pages/data/*.json`

Expected: build passes and deployment JSON files are smaller than source equivalents.

- [ ] **Step 6: Commit**

```bash
git add scripts/build-pages.mjs scripts/generate-cache-version.mjs tests/build-pages.test.mjs lib/offline-status.js tests/offline-status.test.mjs app.js index.html sw.js tests/service-worker-routing.test.mjs
git commit -m "Optimize deployment data and offline status"
```

### Task 6: Visual, Accessibility, Browser Regression, and Documentation Polish

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `app.js`
- Modify: `sw.js`
- Modify: `tests/service-worker-routing.test.mjs`
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `playwright.config.mjs`
- Create: `tests/e2e/search-flow.spec.mjs`
- Modify: `README.md`
- Modify: `PROJECT_CONTEXT.md`
- Add: `assets/fonts/noto-serif-kr-korean-wght-normal.woff2`
- Add: `assets/fonts/OFL.txt`

**Interfaces:**
- Adds: `npm run test:e2e` and `npm run verify`.
- Preserves: static browser execution with no runtime framework.

- [ ] **Step 1: Add failing Playwright browser tests**

Install the pinned browser test dependency and Chromium, then configure `webServer` to run `python3 -m http.server 4173 --directory dist-pages`:

```bash
env npm_config_cache=/private/tmp/npm-cache npm install --save-dev @playwright/test@1.61.1
npx playwright install chromium
```

Test desktop and a `390x844` mobile viewport for:

```js
await expect(page.locator(".result-card")).toHaveCount(6);
await page.getByLabel("검색어").fill("유산");
await expect(page.locator(".word-title").first()).toHaveText("asset");
await page.getByLabel("검색어").fill("a");
await expect(page.getByRole("status").filter({ hasText: "총" })).toContainText("1,596");
await page.getByRole("button", { name: "결과 12개 더 보기" }).click();
await expect(page.locator(".result-card")).toHaveCount(18);
```

Press `Tab` and assert the search input has a non-`none` outline. On mobile assert there is no horizontal overflow and initial document height is below 5,000 CSS pixels.

- [ ] **Step 2: Run E2E and verify RED**

Run: `npm run build:pages && npm run test:e2e`

Expected: FAIL until final semantic and visual contracts are applied.

- [ ] **Step 3: Apply typography and visual hierarchy**

Acquire the pinned Fontsource package without saving it as a dependency, then commit only the Korean font and license:

```bash
env npm_config_cache=/private/tmp/npm-cache npm install --no-save @fontsource/noto-serif-kr@5.2.9
mkdir -p assets/fonts
cp node_modules/@fontsource/noto-serif-kr/files/noto-serif-kr-korean-400-normal.woff2 assets/fonts/noto-serif-kr-korean-wght-normal.woff2
cp node_modules/@fontsource/noto-serif-kr/LICENSE assets/fonts/OFL.txt
```

Declare the local font with `font-display: swap` and use it only for the title. Keep the body on a deliberate system Korean sans stack.

Add `./assets/fonts/noto-serif-kr-korean-wght-normal.woff2` to required precache assets and extend the service-worker asset-closure test so the title font is available offline.

Remove the desktop `white-space: nowrap` and font shrinking rule from `.hero-text`; keep at least `1rem` on desktop and allow wrapping within `72ch`. Compact the mobile hero spacing so the search panel begins above 320px at 390px width. Add category-specific badge colors, a visible chevron and open state for the information disclosure, and `prefers-reduced-motion: reduce` overrides.

- [ ] **Step 4: Apply semantic and live-region polish**

Name the search region and results section with headings. Keep visible status text separate from a visually hidden debounced live announcer updated after 250ms, so every keystroke does not queue a screen-reader announcement. Give each `.feedback-text` `role="status"`, `aria-live="polite"`, and `aria-atomic="true"`.

- [ ] **Step 5: Synchronize version and documentation**

Set package and visible versions to `1.1.0` / `v1.1.0`. Document exact-result ranking, paged counts, optional-data fallback, generated example coverage, compact deployment JSON, offline readiness labels, and the browser release gate. Correct `PROJECT_CONTEXT.md` so cache versions are described as build-generated rather than manually incremented.

Add scripts:

```json
{
  "test:e2e": "playwright test",
  "verify": "npm run test:data && npm run check:data && npm run build:pages && npm run test:e2e"
}
```

- [ ] **Step 6: Verify GREEN and complete release gate**

Run: `npm run verify`

Expected: unit/data/build/browser checks all pass.

Run:

```bash
node --check app.js
node --check sw.js
node --check lib/dictionary-logic.js
node --check lib/search-view-state.js
node --check lib/load-recovery.js
node --check lib/offline-status.js
git diff --check
```

Expected: all commands exit 0 with no output.

- [ ] **Step 7: Commit**

```bash
git add index.html styles.css app.js sw.js tests/service-worker-routing.test.mjs package.json package-lock.json playwright.config.mjs tests/e2e/search-flow.spec.mjs README.md PROJECT_CONTEXT.md assets/fonts
git commit -m "Polish accessible responsive dictionary experience"
```
