import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  TEMPLATE_SELECTORS,
  TOP_LEVEL_SELECTORS,
  createDomRefs
} from "../lib/dom-contract.js";

const TEST_DIR = fileURLToPath(new URL(".", import.meta.url));
const ROOT = path.resolve(TEST_DIR, "..");

const REQUIRED_TOP_LEVEL_SELECTORS = Object.values(TOP_LEVEL_SELECTORS).filter(
  (selector) => !["#hero-total-chip", "#info-summary-text"].includes(selector)
);
const REQUIRED_TEMPLATE_SELECTORS = Object.values(TEMPLATE_SELECTORS);

test("DOM contract exposes the load-more button", () => {
  assert.equal(TOP_LEVEL_SELECTORS.loadMoreButton, "#load-more-button");
});

function createNode(label) {
  return { label };
}

function createTemplateContentNodeMap(overrides = {}) {
  return {
    ".result-card": createNode("result-card"),
    ".word-title": createNode("word-title"),
    ".word-ipa": createNode("word-ipa"),
    ".word-forms": createNode("word-forms"),
    ".category-badge": createNode("category-badge"),
    ".gloss-list": createNode("gloss-list"),
    ".detail-heading": createNode("detail-heading"),
    ".definition-list": createNode("definition-list"),
    ".speak-button": createNode("speak-button"),
    ".check-button": createNode("check-button"),
    ".feedback-text": createNode("feedback-text"),
    ...overrides
  };
}

function createTemplateNode(overrides = {}) {
  const map = createTemplateContentNodeMap(overrides);

  return {
    content: {
      querySelector(selector) {
        return map[selector] ?? null;
      }
    }
  };
}

function createRoot(overrides = {}) {
  const templateOverrides = new Set(overrides.missingTemplateSelectors ?? []);
  const topLevelSelectors = { ...TOP_LEVEL_SELECTORS };
  const templateNode = createTemplateNode(
    Object.fromEntries(
      [...templateOverrides].map((selector) => [selector, null])
    )
  );

  const rootNodes = Object.fromEntries(
    Object.entries(topLevelSelectors).map(([key, selector]) => [
      selector,
      createNode(key)
    ])
  );
  rootNodes[topLevelSelectors.template] = templateNode;

  for (const selector of overrides.missingTopLevelSelectors ?? []) {
    rootNodes[selector] = null;
  }

  return {
    querySelector(selector) {
      return rootNodes[selector] ?? null;
    }
  };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

for (const selector of REQUIRED_TOP_LEVEL_SELECTORS) {
  test(`createDomRefs requires top-level element: ${selector}`, () => {
    const fakeRoot = createRoot({ missingTopLevelSelectors: [selector] });

    assert.throws(
      () => createDomRefs(fakeRoot),
      new RegExp(`Missing required DOM element: ${escapeRegExp(selector)}`)
    );
  });
}

for (const selector of REQUIRED_TEMPLATE_SELECTORS) {
  test(`createDomRefs requires template subnode: ${selector}`, () => {
    const fakeRoot = createRoot({
      missingTemplateSelectors: [selector]
    });

    assert.throws(
      () => createDomRefs(fakeRoot),
      new RegExp(`Missing required DOM element: ${escapeRegExp(selector)}`)
    );
  });
}

test("createDomRefs keeps optional refs optional when missing", () => {
  const fakeRoot = createRoot({
    missingTopLevelSelectors: ["#hero-total-chip", "#info-summary-text"]
  });

  const refs = createDomRefs(fakeRoot);

  assert.equal(refs.heroTotalChip, null);
  assert.equal(refs.infoSummaryText, null);
});

test("result count supports total and shown result copy", () => {
  const indexHtml = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

  assert.match(indexHtml, /id="result-count"[^>]*>총 0개 중 0개 표시</);
});

test("hidden controls stay hidden when component styles set a display value", () => {
  const styles = fs.readFileSync(path.join(ROOT, "styles.css"), "utf8");

  assert.match(styles, /\[hidden\]\s*\{[^}]*display:\s*none\s*!important\s*;/s);
});
