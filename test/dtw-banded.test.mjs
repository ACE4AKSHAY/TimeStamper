import test from "node:test";
import assert from "node:assert/strict";
import { constrainedDtw } from "../src/dtw.js";
import { constrainedDtwBanded } from "../src/dtw-banded.js";

test("rolling-cost DTW matches full-matrix path and cost", () => {
  const left = Array.from({ length: 28 }, (_, row) => [Math.sin(row / 4), Math.cos(row / 7), row / 30]);
  const right = Array.from({ length: 31 }, (_, row) => [Math.sin((row + 1) / 4), Math.cos((row + 1) / 7), (row + 1) / 30]);
  const full = constrainedDtw(left, right, { window: 6 });
  const banded = constrainedDtwBanded(left, right, { window: 6 });
  assert.deepEqual(banded.path, full.path);
  assert.equal(banded.cost, full.cost);
  assert.equal(banded.normalizedCost, full.normalizedCost);
});

test("rolling-cost DTW preserves no-path failures", () => {
  assert.throws(() => constrainedDtwBanded([[0], [1]], [[0], [1]], { distance: () => Infinity }), /No valid DTW path/u);
});
