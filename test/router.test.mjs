import test from "node:test";
import assert from "node:assert/strict";
import { buildEnginePlan } from "../src/router/rules.js";
import { synchronize } from "../src/engine.js";

const lines = [
  { id: "one", text: "one" },
  { id: "two", text: "two" },
  { id: "three", text: "three" },
];

test("router chooses LRC retiming before an independent cross-check", () => {
  const plan = buildEnginePlan({
    hasTimedLyrics: true,
    timingLevel: "line",
    hasReference: false,
    scripts: ["Latin"],
    dominantScript: "Latin",
    lineCount: 3,
    duration: 30,
    vocalCoverage: 0.8,
    instrumentalLikelihood: 0.2,
    hasVocalStem: false,
    repeatedLineRatio: 0,
    reasons: [],
  });
  assert.deepEqual(
    plan.entries.slice(0, 2).map((entry) => entry.engine),
    ["retime-lrc", "vocal-gated-boundary-dp"],
  );
});

test("router refuses high instrumental likelihood", () => {
  const plan = buildEnginePlan({
    hasTimedLyrics: false,
    timingLevel: "none",
    hasReference: false,
    scripts: ["Latin"],
    dominantScript: "Latin",
    lineCount: 3,
    duration: 30,
    vocalCoverage: 0,
    instrumentalLikelihood: 1,
    hasVocalStem: false,
    repeatedLineRatio: 0,
    reasons: [],
  });
  assert.equal(plan.refused, true);
  assert.equal(plan.reason, "instrumental_likelihood_high");
});

test("auto-form fuses deterministic candidates and exposes review diagnostics", () => {
  const result = synchronize({
    engine: "auto-form",
    lyrics: lines,
    duration: 30,
    parameters: {
      profiles: {
        energy: [0.1, 0.8, 0.2, 0.9, 0.2, 0.7, 0.1],
        voicedness: [0.1, 0.9, 0.2, 0.8, 0.2, 0.9, 0.1],
        spectralFlux: [0.1, 0.7, 0.2, 0.8, 0.2, 0.7, 0.1],
      },
      timedLyrics: {
        timedLines: lines.map((line, index) => ({ text: line.text, startTime: index * 5, endTime: null, words: [] })),
        timedWords: [],
      },
      budgetMs: 500,
    },
  });
  assert.equal(result.engine, "auto-form");
  assert.equal(result.lines.length, lines.length);
  assert.ok(result.diagnostics.form.timingLevel === "line");
  assert.ok(Array.isArray(result.diagnostics.plan.entries));
  assert.ok(result.lines.every((line) => line.reviewRequired === true || Number.isFinite(line.confidence)));
});

test("auto-form refusal keeps timestamps unset for instrumental input", () => {
  const result = synchronize({
    engine: "auto-form",
    lyrics: lines,
    duration: 30,
    parameters: { profiles: { energy: [0.1, 0.2, 0.1], voicedness: [0.01, 0.01, 0.01] } },
  });
  assert.equal(result.diagnostics.refused, true);
  assert.ok(result.lines.every((line) => line.startTime === null && line.confidence === 0));
});
