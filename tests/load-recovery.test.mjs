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
    this.disabled = false;
    this.attributes = new Map();
    this.listeners = new Map();
  }

  append(...children) {
    this.children.push(...children);
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  click() {
    return this.listeners.get("click")?.();
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
  assert.equal(repeatedView.getAttribute("role"), "status");
  assert.equal(repeatedView.getAttribute("aria-live"), "polite");
  assert.equal(repeatedView.getAttribute("aria-atomic"), "true");
  assert.notEqual(initialView, repeatedView);

  retryButton.click();

  assert.equal(retries, 1);
});

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
}

test("renderLoadFailure disables the retry button and ignores repeated clicks while pending", async () => {
  const container = new FakeContainer();
  const deferred = createDeferred();
  let retries = 0;
  const recovery = renderLoadFailure({
    container,
    message: "사전 데이터를 불러오지 못했습니다.",
    onRetry: () => {
      retries += 1;
      return deferred.promise;
    }
  });
  const retryButton = recovery.children[1];

  const pendingRetry = retryButton.click();
  retryButton.click();

  assert.equal(retries, 1);
  assert.equal(retryButton.disabled, true);
  assert.equal(retryButton.textContent, "다시 시도 중...");
  assert.equal(retryButton.getAttribute("aria-busy"), "true");

  deferred.resolve();
  await pendingRetry;
});

test("renderLoadFailure restores the retry button after a successful retry", async () => {
  const container = new FakeContainer();
  const deferred = createDeferred();
  const recovery = renderLoadFailure({
    container,
    message: "사전 데이터를 불러오지 못했습니다.",
    onRetry: () => deferred.promise
  });
  const retryButton = recovery.children[1];
  const retry = retryButton.click();

  deferred.resolve();
  await retry;

  assert.equal(retryButton.disabled, false);
  assert.equal(retryButton.textContent, "다시 시도");
  assert.equal(retryButton.getAttribute("aria-busy"), "false");
});

test("renderLoadFailure restores the retry button after a rejected retry without leaking the error", async () => {
  const container = new FakeContainer();
  const deferred = createDeferred();
  const recovery = renderLoadFailure({
    container,
    message: "사전 데이터를 불러오지 못했습니다.",
    onRetry: () => deferred.promise
  });
  const retryButton = recovery.children[1];
  const retry = retryButton.click();

  deferred.reject(new Error("retry failed"));
  await retry;

  assert.equal(retryButton.disabled, false);
  assert.equal(retryButton.textContent, "다시 시도");
  assert.equal(retryButton.getAttribute("aria-busy"), "false");
});
