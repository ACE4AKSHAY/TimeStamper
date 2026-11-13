import test from "node:test";
import assert from "node:assert/strict";
import { parseTimedLyrics, timingLevel } from "../src/online/lyric-normalizer.js";
import { exportEnhancedLrc } from "../src/enhanced-lrc.js";
import { interpolateWordTimings, tokenizeWords } from "../src/word-timing.js";
import { applyStructureAwareChecks } from "../src/structure-check.js";

test("word interpolation is Unicode-safe and lower-confidence than source timing", () => {
  assert.deepEqual(tokenizeWords("నమస్కారం दुनिया"), ["నమస్కారం", "दुनिया"]);
  const result = interpolateWordTimings({ text: "నమస్కారం दुनिया", startTime: 1, endTime: 3, confidence: 1 });
  assert.equal(result.method, "interpolated");
  assert.equal(result.words.length, 2);
  assert.ok(result.words[0].endTime <= result.words[1].startTime);
  assert.ok(result.confidence < 1);
});

test("enhanced LRC exports and round-trips word timings", () => {
  const project = {
    metadata: { title: "Words", artist: "", album: "", language: "" },
    lyrics: { offsetMs: 0 },
    timeline: {
      lines: [
        {
          originalText: "hello world",
          startTime: 1,
          endTime: 3,
          order: 0,
          words: [
            { text: "hello", startTime: 1, endTime: 2 },
            { text: "world", startTime: 2, endTime: 3 },
          ],
        },
      ],
    },
  };
  const text = exportEnhancedLrc(project);
  const parsed = parseTimedLyrics(text);
  assert.equal(timingLevel(parsed), "word");
  assert.deepEqual(
    parsed.timedLines[0].words.map((word) => word.text),
    ["hello", "world"],
  );
  assert.deepEqual(
    parsed.timedLines[0].words.map((word) => word.startTime),
    [1, 2],
  );
});

test("structure-aware checks improve a low-confidence repeated line or flag it", () => {
  const result = applyStructureAwareChecks(
    [
      { id: "a", text: "chorus", startTime: 1, confidence: 0.9, reviewRequired: false, reasons: [] },
      { id: "b", text: "chorus", startTime: 5, confidence: 0.2, reviewRequired: true, reasons: [] },
    ],
    [0, 1, 0, 0, 1, 0, 0, 0],
    8,
  );
  assert.equal(result.diagnostics.enabled, true);
  assert.equal(result.diagnostics.comparedPairs, 1);
  assert.ok(result.lines[1].structureReview);
  assert.ok(result.lines[1].confidence >= 0.2);
});
