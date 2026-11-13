import test from "node:test";
import assert from "node:assert/strict";
import {
  createHistory,
  filterTimelineLines,
  formatConfidence,
  summarizeAlignmentResult,
} from "../src/ui/alignment-panel.js";

test("alignment panel filters review and missing lines without mutating input", () => {
  const lines = [
    { id: "a", startTime: 1, reviewRequired: false },
    { id: "b", startTime: 2, reviewRequired: true },
    { id: "c", startTime: null, reviewRequired: true },
  ];
  assert.deepEqual(
    filterTimelineLines(lines, "review").map((line) => line.id),
    ["b", "c"],
  );
  assert.deepEqual(
    filterTimelineLines(lines, "missing").map((line) => line.id),
    ["c"],
  );
  assert.equal(filterTimelineLines(lines, "all"), lines);
  assert.equal(lines[0].startTime, 1);
});

test("alignment summary exposes engine and review count", () => {
  const idle = summarizeAlignmentResult(null);
  assert.equal(idle.status, "idle");
  const summary = summarizeAlignmentResult({
    engine: "auto-form",
    lines: [{ reviewRequired: false }, { reviewRequired: true }],
    diagnostics: { plan: { reasons: ["timed lyrics supplied"] } },
  });
  assert.equal(summary.status, "review");
  assert.equal(summary.reviewed, 1);
  assert.match(summary.message, /1 need review/);
  assert.deepEqual(summary.reasons, ["timed lyrics supplied"]);
  assert.equal(formatConfidence(0.756), "76%");
  assert.equal(formatConfidence(null), "—");
});

test("history is bounded and supports undo and redo", () => {
  const history = createHistory({ value: 0 }, { limit: 3 });
  history.commit({ value: 1 });
  history.commit({ value: 2 });
  history.commit({ value: 3 });
  history.commit({ value: 4 });
  assert.equal(history.size(), 3);
  assert.equal(history.canUndo(), true);
  assert.deepEqual(history.undo({ value: 4 }), { value: 3 });
  assert.deepEqual(history.undo({ value: 3 }), { value: 2 });
  assert.equal(history.undo({ value: 2 }), null);
  assert.deepEqual(history.redo({ value: 2 }), { value: 3 });
  history.commit({ value: 8 });
  assert.equal(history.canRedo(), false);
});
