import test from "node:test";
import assert from "node:assert/strict";

import { createLiveAnnouncer } from "../lib/live-announcer.js";

function createTimers() {
  const scheduled = new Map();
  const delays = new Map();
  let nextId = 1;

  return {
    clearTimeout(id) {
      scheduled.delete(id);
      delays.delete(id);
    },
    runAll() {
      for (const callback of [...scheduled.values()]) {
        callback();
      }
      scheduled.clear();
    },
    setTimeout(callback, delay) {
      const id = nextId;
      nextId += 1;
      scheduled.set(id, callback);
      delays.set(id, delay);
      return id;
    },
    scheduledDelays() {
      return [...delays.values()];
    }
  };
}

test("live announcer only publishes the latest status after its 250ms debounce", () => {
  const timers = createTimers();
  const announcements = [];
  const announce = createLiveAnnouncer({
    onAnnounce: (message) => announcements.push(message),
    setTimeoutFn: timers.setTimeout,
    clearTimeoutFn: timers.clearTimeout
  });

  announce("a 검색 결과");
  announce("as 검색 결과");

  assert.deepEqual(timers.scheduledDelays(), [250]);
  assert.deepEqual(announcements, []);

  timers.runAll();

  assert.deepEqual(announcements, ["as 검색 결과"]);
});
