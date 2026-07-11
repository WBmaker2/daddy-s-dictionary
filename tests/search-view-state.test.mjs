import test from "node:test";
import assert from "node:assert/strict";

import { createSearchViewState } from "../lib/search-view-state.js";

test("search view state expands the visible limit and resets it", () => {
  const state = createSearchViewState({ initialLimit: 6, pageSize: 12 });

  assert.equal(state.limit, 6);
  state.showMore();
  assert.equal(state.limit, 18);
  state.reset();
  assert.equal(state.limit, 6);
});
