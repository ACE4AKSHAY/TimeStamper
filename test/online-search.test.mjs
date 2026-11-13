import test from "node:test";
import assert from "node:assert/strict";
import { searchOnlineLyrics } from "../src/online/online-search.js";

function createCache() {
  const values = new Map();
  return {
    reads: 0,
    writes: 0,
    get(providerId, key) {
      this.reads++;
      return values.get(`${providerId}:${key}`) ?? null;
    },
    set(providerId, key, result) {
      this.writes++;
      values.set(`${providerId}:${key}`, result);
    },
  };
}

test("searchOnlineLyrics fans out concurrently, ranks results and isolates failures", async () => {
  const cache = createCache();
  const failures = [];
  const providers = [
    {
      id: "plain",
      search: async () => [{ title: "Song", artist: "Singer", plainLyrics: "text", providerId: "lyrics-ovh" }],
    },
    {
      id: "timed",
      search: async () => [{ title: "Song", artist: "Singer", syncedLyrics: "[00:01.00]line", providerId: "lrclib" }],
    },
    {
      id: "offline",
      search: async () => {
        throw new Error("offline");
      },
    },
  ];
  const result = await searchOnlineLyrics({
    providers,
    cache,
    query: "Singer - Song",
    context: { artist: "Singer", title: "Song" },
    onProviderError: (provider, error) => failures.push(`${provider.id}:${error.message}`),
  });
  assert.equal(result.results[0].providerId, "lrclib");
  assert.equal(result.responses.filter((response) => response.status === "rejected").length, 1);
  assert.deepEqual(failures, ["offline:offline"]);
  assert.equal(cache.writes, 2);
});

test("searchOnlineLyrics reuses cached normalized results", async () => {
  const cache = createCache();
  let calls = 0;
  const providers = [
    {
      id: "timed",
      search: async () => {
        calls++;
        return [{ title: "Song", syncedLyrics: "[00:01.00]line" }];
      },
    },
  ];
  const options = { providers, cache, query: "Song", context: { title: "Song" } };
  await searchOnlineLyrics(options);
  const second = await searchOnlineLyrics(options);
  assert.equal(calls, 1);
  assert.equal(second.results[0].timingLevel, "line");
  assert.equal(cache.writes, 1);
});

test("searchOnlineLyrics aborts before returning partial results", async () => {
  const controller = new AbortController();
  const providers = [
    {
      id: "slow",
      search: async (_query, _context, { signal }) =>
        await new Promise((resolve, reject) =>
          signal.addEventListener("abort", () => reject(signal.reason), { once: true }),
        ),
    },
  ];
  const pending = searchOnlineLyrics({ providers, query: "Song", signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, (error) => error.name === "AbortError");
});
