import test from "node:test";
import assert from "node:assert/strict";

import { renderLoadFailure } from "../lib/load-recovery.js";

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.className = "";
    this.textContent = "";
    this.type = "";
    this.listeners = new Map();
  }

  append(...children) {
    this.children.push(...children);
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  click() {
    this.listeners.get("click")?.();
  }
}

class FakeContainer extends FakeElement {
  constructor() {
    super("div");
    this.ownerDocument = {
      createElement: (tagName) => new FakeElement(tagName)
    };
  }

  replaceChildren(...children) {
    this.children = children;
  }
}

test("renderLoadFailure shows Korean recovery copy and retries once after repeated renders", () => {
  const container = new FakeContainer();
  let retries = 0;
  const options = {
    container,
    message: "사전 데이터를 불러오지 못했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.",
    onRetry: () => {
      retries += 1;
    }
  };

  const initialView = renderLoadFailure(options);
  const repeatedView = renderLoadFailure(options);
  const retryButton = repeatedView.children[1];

  assert.equal(container.children.length, 1);
  assert.equal(container.children[0], repeatedView);
  assert.equal(repeatedView.className, "load-failure");
  assert.equal(repeatedView.children[0].textContent, options.message);
  assert.equal(retryButton.textContent, "다시 시도");
  assert.notEqual(initialView, repeatedView);

  retryButton.click();

  assert.equal(retries, 1);
});
