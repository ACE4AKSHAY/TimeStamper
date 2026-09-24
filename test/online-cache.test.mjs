import test from "node:test";
import assert from "node:assert/strict";
import { OnlineLyricsCache } from "../src/online/online-cache.js";

function memoryStorage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
}

test("online cache round-trips provider results and keeps providers isolated", () => {
  const cache = new OnlineLyricsCache({ storage: memoryStorage(), now: () => 1000, ttlMs: 1000 });
  cache.set("lrclib", "Singer\u0000Song", [{ title: "Song", syncedLyrics: "[00:01.00]line" }]);
  assert.deepEqual(cache.get("lrclib", "sInGeR\u0000SoNg"), [{ title: "Song", syncedLyrics: "[00:01.00]line" }]);
  assert.equal(cache.get("lyrics-ovh", "Singer\u0000Song"), null);
});

test("online cache expires entries and can clear all stored results", () => {
  let now = 1000;
  const storage = memoryStorage();
  const cache = new OnlineLyricsCache({ storage, now: () => now, ttlMs: 100 });
  cache.set("lrclib", "Song", []);
  assert.deepEqual(cache.get("lrclib", "Song"), []);
  now = 1100;
  assert.equal(cache.get("lrclib", "Song"), null);
  cache.set("lrclib", "Song", [{ title: "Song" }]);
  cache.clear();
  assert.equal(cache.get("lrclib", "Song"), null);
});
