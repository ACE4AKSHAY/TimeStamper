import test from "node:test";
import assert from "node:assert/strict";
import { validateAlignmentRequest, validateAlignmentResult, validateFormDescriptor } from "../src/contracts/index.js";

function validRequest() {
  return {
    lines: [{ id: "line-1", text: "నమస్కారం", startTime: null, endTime: null }],
    audio: {
      duration: 10,
      sampleRate: 48_000,
      profiles: { energy: [0, 1] },
      getFeature: () => [],
    },
    timedLyrics: {
      timedLines: [{ text: "నమస్కారం", startTime: 1, endTime: null, words: [] }],
      timedWords: [],
    },
    reference: { audio: { duration: 10 }, verifiedStarts: [1] },
    options: { mode: "auto", budgetMs: 250, signal: { aborted: false }, plugins: [] },
  };
}

test("validateAlignmentRequest accepts lazy profiles, timed lyrics and references", () => {
  const request = validRequest();
  assert.equal(validateAlignmentRequest(request), request);
});

test("validateAlignmentRequest reports the invalid field path", () => {
  const request = validRequest();
  request.lines[0].id = "";
  request.audio.duration = -1;
  assert.throws(
    () => validateAlignmentRequest(request),
    (error) =>
      error instanceof TypeError && /lines\[0\]\.id/u.test(error.message) && /audio\.duration/u.test(error.message),
  );
});

test("validateAlignmentResult accepts nullable timestamps and JSON diagnostics", () => {
  const result = {
    engine: "auto-form",
    engineVersion: "0.4.0",
    lines: [
      { id: "line-1", startTime: null, endTime: null, confidence: 0, reviewRequired: true, reasons: ["instrumental"] },
    ],
    words: [],
    diagnostics: { plan: ["retime-lrc"], refused: true },
    timingsMs: { total: 1.5 },
    parameters: { mode: "auto" },
  };
  assert.equal(validateAlignmentResult(result), result);
});

test("validateAlignmentResult rejects reversed timestamps and non-serializable values", () => {
  const result = {
    engine: "energy-baseline",
    engineVersion: "0.4.0",
    lines: [{ id: "line-1", startTime: 2, endTime: 1, confidence: null, reviewRequired: false, reasons: [] }],
    diagnostics: { bad: () => {} },
    timingsMs: { total: 1 },
    parameters: {},
  };
  assert.throws(
    () => validateAlignmentResult(result),
    (error) =>
      error instanceof TypeError &&
      /endTime must be >= startTime/u.test(error.message) &&
      /non-serializable/u.test(error.message),
  );
});

test("validateFormDescriptor accepts multilingual form metadata", () => {
  const form = {
    hasTimedLyrics: true,
    timingLevel: "line",
    hasReference: false,
    scripts: ["Telugu", "Devanagari", "Japanese", "mixed"],
    dominantScript: "Telugu",
    lineCount: 4,
    duration: 180,
    vocalCoverage: 0.72,
    instrumentalLikelihood: 0.1,
    hasVocalStem: false,
    repeatedLineRatio: 0.25,
    languageHint: "te",
    reasons: ["timed lyrics supplied"],
  };
  assert.equal(validateFormDescriptor(form), form);
});

test("validateFormDescriptor rejects out-of-range ratios and unknown timing levels", () => {
  assert.throws(
    () =>
      validateFormDescriptor({
        hasTimedLyrics: false,
        timingLevel: "sentence",
        hasReference: false,
        scripts: [],
        dominantScript: null,
        lineCount: 1,
        duration: 1,
        vocalCoverage: 2,
        instrumentalLikelihood: null,
        hasVocalStem: false,
        repeatedLineRatio: -0.1,
        reasons: [],
      }),
    (error) =>
      error instanceof TypeError && /timingLevel/u.test(error.message) && /between 0 and 1/u.test(error.message),
  );
});
