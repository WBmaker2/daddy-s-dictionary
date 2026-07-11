import test from "node:test";
import assert from "node:assert/strict";

import { trackOfflineReadiness } from "../lib/offline-status.js";

test("trackOfflineReadiness reports preparing before ready when service worker activation finishes", async () => {
  const statuses = [];
  let resolveReady;
  const navigatorObject = {
    serviceWorker: {
      register(path) {
        assert.equal(path, "./sw.js");
        return Promise.resolve({ scope: "./" });
      },
      ready: new Promise((resolve) => {
        resolveReady = resolve;
      })
    }
  };

  const readiness = trackOfflineReadiness({
    navigatorObject,
    onStatus: (status) => statuses.push(status)
  });

  assert.deepEqual(statuses, ["preparing"]);
  resolveReady();
  assert.equal(await readiness, "ready");
  assert.deepEqual(statuses, ["preparing", "ready"]);
});

test("trackOfflineReadiness reports unsupported without attempting registration", async () => {
  const statuses = [];

  const readiness = trackOfflineReadiness({
    navigatorObject: {},
    onStatus: (status) => statuses.push(status)
  });

  assert.equal(await readiness, "unsupported");
  assert.deepEqual(statuses, ["unsupported"]);
});

test("trackOfflineReadiness absorbs registration failures and reports failed", async () => {
  const statuses = [];
  const navigatorObject = {
    serviceWorker: {
      register() {
        throw new Error("registration blocked");
      },
      ready: Promise.resolve()
    }
  };

  await assert.doesNotReject(async () => {
    const readiness = trackOfflineReadiness({
      navigatorObject,
      onStatus: (status) => statuses.push(status)
    });
    assert.equal(await readiness, "failed");
  });
  assert.deepEqual(statuses, ["preparing", "failed"]);
});

test("trackOfflineReadiness absorbs asynchronously rejected registrations and reports failed", async () => {
  const statuses = [];
  const navigatorObject = {
    serviceWorker: {
      register() {
        return Promise.reject(new Error("registration rejected"));
      },
      ready: Promise.resolve()
    }
  };

  await assert.doesNotReject(async () => {
    assert.equal(
      await trackOfflineReadiness({
        navigatorObject,
        onStatus: (status) => statuses.push(status)
      }),
      "failed"
    );
  });
  assert.deepEqual(statuses, ["preparing", "failed"]);
});

test("trackOfflineReadiness ignores asynchronously rejected status callbacks", async () => {
  const navigatorObject = {
    serviceWorker: {
      register() {
        return Promise.resolve({ scope: "./" });
      },
      ready: Promise.resolve()
    }
  };

  await assert.doesNotReject(async () => {
    assert.equal(
      await trackOfflineReadiness({
        navigatorObject,
        onStatus: async () => {
          throw new Error("status UI failed");
        }
      }),
      "ready"
    );
  });
});
