import test from "node:test";
import assert from "node:assert/strict";
import { extractVersionMarkers, rankLyricResults, scoreLyricResult } from "../src/online/lyric-matcher.js";

test("version markers require recording/version context for ambiguous words", () => {
  assert.deepEqual(extractVersionMarkers("Radio Edit"), []);
  assert.deepEqual(extractVersionMarkers("Live Forever"), []);
  assert.deepEqual(extractVersionMarkers("Cover Me"), []);
  assert.deepEqual(extractVersionMarkers("Song (Live)"), ["live"]);
  assert.deepEqual(extractVersionMarkers("Song (Radio Edit)"), ["remix"]);
  assert.deepEqual(extractVersionMarkers("Song (Instrumental Piano Version)"), ["instrumental", "piano"]);
});

test("scoreLyricResult rewards exact metadata, timing and duration", () => {
  const score = scoreLyricResult(
    {
      providerId: "lrclib",
      title: "Song (Live)",
      artist: "Singer",
      duration: 180,
      syncedLyrics: "[00:01.00]line",
      timingLevel: "line",
    },
    { title: "Song (Live)", artist: "Singer", duration: 180, audioName: "Song (Live).mp3" },
  );
  assert.equal(score.expectedVersions[0], "live");
  assert.deepEqual(score.resultVersions, ["live"]);
  assert.ok(score.score >= 80);
  assert.match(score.matchReason, /exact title/u);
});

test("rankLyricResults keeps the strongest candidate first and preserves result fields", () => {
  const plain = { providerId: "lyrics-ovh", title: "Song", artist: "Singer", plainLyrics: "text", syncedLyrics: "" };
  const timed = {
    providerId: "lrclib",
    title: "Song",
    artist: "Singer",
    duration: 180,
    syncedLyrics: "[00:01.00]line",
  };
  const ranked = rankLyricResults([plain, timed], { title: "Song", artist: "Singer", duration: 180 });
  assert.equal(ranked[0].providerId, "lrclib");
  assert.equal(ranked[0].syncedLyrics, timed.syncedLyrics);
  assert.ok(ranked[0].score > ranked[1].score);
});
