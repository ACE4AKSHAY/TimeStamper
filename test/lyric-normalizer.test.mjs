import test from "node:test";
import assert from "node:assert/strict";
import { parseTimedLyrics, timingLevel } from "../src/online/lyric-normalizer.js";

test("parses multiple line timestamps in chronological order", () => {
  const result = parseTimedLyrics("[00:03.00]later\n[00:01.25]first");
  assert.deepEqual(
    result.timedLines.map((line) => line.text),
    ["first", "later"],
  );
  assert.deepEqual(
    result.timedLines.map((line) => line.startTime),
    [1.25, 3],
  );
  assert.deepEqual(
    result.timedLines.map((line) => line.endTime),
    [3, null],
  );
  assert.equal(result.timedWords.length, 0);
});

test("parses enhanced LRC words and keeps native text unchanged", () => {
  const result = parseTimedLyrics("[00:01.00]<00:01.00>ప్రే<00:01.50>మ");
  assert.equal(timingLevel(result), "word");
  assert.deepEqual(result.timedLines[0].words, [
    { text: "ప్రే", startTime: 1, endTime: 1.5 },
    { text: "మ", startTime: 1.5, endTime: null },
  ]);
  assert.deepEqual(result.timedWords, result.timedLines[0].words);
});

test("returns an empty normalized result for plain or empty text", () => {
  assert.deepEqual(parseTimedLyrics("plain lyrics"), { timedLines: [], timedWords: [] });
  assert.equal(timingLevel({ plainLyrics: "plain" }), "plain");
  assert.equal(timingLevel({}), "unknown");
});
