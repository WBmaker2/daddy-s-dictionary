# Mobile Boundary Fix Report

## Scope
- Worktree: `/private/tmp/daddys-dictionary-quality-ux`
- Branch: `codex/dictionary-quality-ux`
- Base: `b548d2e543f7b92f8b90879cc9617f0020fa28b1`
- Implementation commit: `f3a0908aedf57f51c438b19443670f58f037be7a` (`Fix mobile update history bounds`)

## Changed Files
- `styles.css`: reserved vertical space for the mobile update-history summary, with a smaller 360px override that retains the search-panel top contract; changed the fixed panel to logical inline insets and automatic width.
- `tests/e2e/search-flow.spec.mjs`: checks 360px, 390px, and 540px against `documentElement.clientWidth/clientHeight`, verifies the focused summary clears the eyebrow and title, and keeps the opened panel within content bounds.
- `tests/app-dom-contract.test.mjs`: locks the mobile reserved-space and inset-based panel CSS contract.
- `index.html`: expanded the existing 2026-07-12 update-history entry to mention the mobile layout change without adding a date.
- `README.md`: documents the expanded browser layout checks.

## RED-GREEN Evidence
- RED: `node --test tests/app-dom-contract.test.mjs` reported 38 passing and 1 failing test because the 540px mobile rule had neither the reserved hero space nor inset-based automatic panel width.
- RED: `npm run test:e2e -- tests/e2e/search-flow.spec.mjs --project=mobile` reported 6 passing and 1 failing test: the summary focus boundary reached `55.4375px` while the eyebrow started at `23px`.
- RED: after extending the browser contract to 360px, the search panel began at `331.109375px`, exceeding the 320px maximum.
- GREEN: focused DOM contract tests reported 39 passing; mobile Playwright reported 7 passing across 360px, 390px, and 540px; desktop Playwright reported 6 passing and 1 intentional mobile-only skip.

## Final Verification
- `npm run verify`: passed.
- Node tests: 138 passed, 0 failed.
- Strict data check: passed with 3,489 merged entries and complete example coverage.
- `npm run build:pages`: passed.
- Playwright: 13 passed, 1 intentional desktop skip.
- `git diff --check`: passed before the implementation commit.
