import test from "node:test";
import assert from "node:assert/strict";
import { detectForm, detectLineScript } from "../src/forms/detect-form.js";

test("detectLineScript identifies multilingual and mixed-script lines", () => {
  assert.equal(detectLineScript("hello world"), "Latin");
  assert.equal(detectLineScript("నమస్కారం"), "Telugu");
  assert.equal(detectLineScript("नमस्ते"), "Devanagari");
  assert.equal(detectLineScript("こんにちは"), "Hiragana");
  assert.equal(detectLineScript("hello नमस्ते"), "mixed");
  assert.equal(detectLineScript("123 ---"), "other");
});

test("detectForm reports timing, repeated structure and a vocal proxy", () => {
  const form = detectForm({
    lines: [{ text: "నమస్కారం", startTime: 1 }, { text: "नमस्ते" }, { text: "నమస్కారం" }, { text: "こんにちは" }],
    audio: { duration: 180, profiles: { energy: [0, 0.8, 0.9, 0.1], voicedness: [0, 0.8, 0.7, 0.1] } },
    timedLyrics: { timedLines: [{ text: "నమస్కారం", startTime: 1, endTime: 2, words: [] }], timedWords: [] },
    languageHint: "multilingual",
  });
  assert.equal(form.timingLevel, "line");
  assert.equal(form.hasTimedLyrics, true);
  assert.deepEqual(form.scripts, ["Telugu", "Devanagari", "Telugu", "Hiragana"]);
  assert.equal(form.dominantScript, "Telugu");
  assert.equal(form.lineCount, 4);
  assert.equal(form.repeatedLineRatio, 0.25);
  assert.ok(form.vocalCoverage > 0.5);
  assert.equal(form.instrumentalLikelihood, 1 - form.vocalCoverage);
});

test("detectForm handles one-line empty and instrumental-like inputs", () => {
  const form = detectForm({
    lines: [{ text: "" }],
    audio: { duration: 4, profiles: { energy: [0, 0, 0], voicedness: [0, 0, 0] } },
  });
  assert.equal(form.timingLevel, "none");
  assert.equal(form.dominantScript, null);
  assert.equal(form.repeatedLineRatio, 0);
  assert.equal(form.vocalCoverage, 0);
  assert.equal(form.instrumentalLikelihood, 1);
  assert.ok(form.reasons.some((reason) => reason.includes("instrumental")));
});
