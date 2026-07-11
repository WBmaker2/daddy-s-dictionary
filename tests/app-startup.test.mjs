import test from "node:test";
import assert from "node:assert/strict";

import { createAppStartup } from "../lib/app-startup.js";

test("app startup begins offline readiness synchronously before loading the dictionary", async () => {
  const calls = [];
  const startup = createAppStartup({
    startOfflineReadiness() {
      calls.push("offline");
    },
    loadDictionary() {
      calls.push("dictionary");
      return Promise.resolve({ words: [] });
    }
  });

  await startup.loadDictionary();

  assert.deepEqual(calls, ["offline", "dictionary"]);
});

test("app startup only begins offline readiness once across a failed load and retry", async () => {
  const calls = [];
  let attempts = 0;
  const startup = createAppStartup({
    startOfflineReadiness() {
      calls.push("offline");
    },
    loadDictionary() {
      attempts += 1;
      calls.push(`dictionary-${attempts}`);

      if (attempts === 1) {
        return Promise.reject(new Error("network unavailable"));
      }

      return Promise.resolve({ words: [] });
    }
  });

  await assert.rejects(startup.loadDictionary(), /network unavailable/);
  await startup.loadDictionary();

  assert.deepEqual(calls, ["offline", "dictionary-1", "dictionary-2"]);
});
