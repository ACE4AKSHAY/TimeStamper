import test from "node:test";
import assert from "node:assert/strict";
import { buildSyntheticCases, evaluateCases, formatEvaluationMarkdown } from "../scripts/evaluate.mjs";

test("evaluation runs the synthetic corpus across registry engines and auto-form", () => {
  const report = evaluateCases(buildSyntheticCases());
  assert.equal(report.realAccuracyClaim, false);
  assert.ok(report.engineResults["auto-form"]);
  assert.ok(Object.keys(report.engineResults).length >= 16);
  assert.ok(report.cases.every((item) => item.referenceStarts.length > 0));
  assert.match(formatEvaluationMarkdown(report), /Router comparisons/u);
});
