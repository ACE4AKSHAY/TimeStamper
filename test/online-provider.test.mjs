import test from "node:test";
import assert from "node:assert/strict";
import { LrcLibProvider, canUseOnlineSearch, normalizeResult } from "../src/online-provider.js";

function fakeFetch(payload, options = {}) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    if (options.error) throw new Error(options.error);
    return { ok: options.ok ?? true, status: options.status ?? 200, json: async () => payload };
  };
  fetchImpl.calls = calls;
  return fetchImpl;
}

test("normalizes LRCLIB result fields without changing Unicode lyrics", () => {
  const result = normalizeResult({ trackName: "ఊహలు", artistName: "Artist", syncedLyrics: "[00:01.00]పాట" });
  assert.deepEqual(result, { id: null, title: "ఊహలు", artist: "Artist", album: "", duration: null, plainLyrics: "", syncedLyrics: "[00:01.00]పాట", sourceUrl: "" });
});

test("LRCLIB provider searches and fetches using injected transport", async () => {
  const fetchImpl = fakeFetch([{ id: 4, trackName: "Song", artistName: "Singer", syncedLyrics: "[00:01.00]line" }]);
  const provider = new LrcLibProvider({ fetchImpl, baseUrl: "https://example.test/api/" });
  const results = await provider.search("Song Singer");
  assert.equal(results[0].title, "Song");
  assert.match(fetchImpl.calls[0].url, /\/search\?q=Song%20Singer/u);
  assert.equal((await provider.fetchLyrics(results[0])).syncedLyrics, "[00:01.00]line");
});

test("LRCLIB provider reports HTTP failures and offline search stays opt-in", async () => {
  const provider = new LrcLibProvider({ fetchImpl: fakeFetch({}, { ok: false, status: 503 }) });
  await assert.rejects(() => provider.search("Song"), /503/u);
  assert.equal(canUseOnlineSearch({ onlineSearchEnabled: false }), false);
});
