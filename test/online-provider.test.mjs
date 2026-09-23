import test from "node:test";
import assert from "node:assert/strict";
import { LrcLibProvider, LyricsOvhProvider, WebLyricsSearchProvider, canUseOnlineSearch, createOnlineProviders, normalizeResult, parseArtistTitle, selectOnlineProviders } from "../src/online-provider.js";

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
  assert.deepEqual(result, { id: null, title: "ఊహలు", artist: "Artist", album: "", duration: null, plainLyrics: "", syncedLyrics: "[00:01.00]పాట", sourceUrl: "", providerId: "lrclib", providerName: "LRCLIB", resultKind: "timed" });
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

test("lyrics.ovh provider returns plain copyable lyrics for artist-title context", async () => {
  const fetchImpl = fakeFetch({ lyrics: "line one\nline two" });
  const provider = new LyricsOvhProvider({ fetchImpl, baseUrl: "https://example.test" });
  const results = await provider.search("ignored", { artist: "Singer", title: "Song" });
  assert.equal(results[0].resultKind, "plain");
  assert.equal(results[0].plainLyrics, "line one\nline two");
  assert.match(fetchImpl.calls[0].url, /\/v1\/Singer\/Song/u);
});

test("web source provider returns labeled manual-copy links without scraping", async () => {
  const results = await new WebLyricsSearchProvider().search("Singer - Song");
  assert.equal(results.length, 3);
  assert.ok(results.every((result) => result.resultKind === "link" && result.sourceUrl.startsWith("https://")));
});

test("online provider registry and artist-title parsing expose all source classes", () => {
  assert.deepEqual(parseArtistTitle("Singer - Song"), { artist: "Singer", title: "Song" });
  const providers = createOnlineProviders({ fetchImpl: fakeFetch([]), lrcLib: { baseUrl: "https://lrc.test/api" }, lyricsOvh: { baseUrl: "https://plain.test" } });
  assert.deepEqual(providers.map((provider) => provider.id), ["lrclib", "lyrics-ovh", "web-search"]);
  assert.equal(providers[0].baseUrl, "https://lrc.test/api");
  assert.equal(providers[1].baseUrl, "https://plain.test");
});

test("source selection disables only explicitly disabled providers", () => {
  const providers = createOnlineProviders({ fetchImpl: fakeFetch([]) });
  assert.deepEqual(selectOnlineProviders(providers, { "lyrics-ovh": false }).map((provider) => provider.id), ["lrclib", "web-search"]);
  assert.deepEqual(selectOnlineProviders(providers, {}).map((provider) => provider.id), ["lrclib", "lyrics-ovh", "web-search"]);
});

test("LRCLIB forwards cancellation and enforces a bounded request timeout", async () => {
  let observedSignal;
  const fetchImpl = async (_url, init) => {
    observedSignal = init.signal;
    return new Promise((resolve, reject) => {
      init.signal.addEventListener("abort", () => reject(init.signal.reason), { once: true });
    });
  };
  const provider = new LrcLibProvider({ fetchImpl, timeoutMs: 100 });
  await assert.rejects(() => provider.search("Song"), (error) => error.name === "TimeoutError");
  assert.equal(observedSignal.aborted, true);

  const parent = new AbortController();
  const cancelProvider = new LrcLibProvider({ fetchImpl, timeoutMs: 1000 });
  const pending = cancelProvider.search("Song", {}, { signal: parent.signal });
  parent.abort();
  await assert.rejects(() => pending, (error) => error.name === "AbortError");
});
