import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createAudioFeatureCacheKey, createFeatureCacheKey, FeatureCache } from "../src/feature-cache.mjs";

test("feature cache round-trips derived values and replaces entries", async () => {
  const root = await mkdtemp(join(tmpdir(), "lyricsync-cache-"));
  const cache = new FeatureCache(root);
  const key = createFeatureCacheKey({ audio: "song", options: { hop: 256, frame: 512 } });
  assert.equal(await cache.get(key), null);
  await cache.set(key, { energy: [0.1, 0.2] }, { kind: "profiles" });
  assert.deepEqual(await cache.get(key), { energy: [0.1, 0.2] });
  await cache.set(key, { energy: [0.3] });
  assert.deepEqual(await cache.get(key), { energy: [0.3] });
  await cache.delete(key);
  assert.equal(await cache.get(key), null);
});

test("audio cache key changes when extraction settings or file identity changes", async () => {
  const root = await mkdtemp(join(tmpdir(), "lyricsync-cache-key-"));
  const audio = join(root, "audio.wav");
  await writeFile(audio, Buffer.from("one"));
  const first = await createAudioFeatureCacheKey(audio, { bins: 100 });
  const second = await createAudioFeatureCacheKey(audio, { bins: 200 });
  assert.notEqual(first, second);
  assert.match(await readFile(audio, "utf8"), /one/u);
});

test("feature cache rejects non-SHA keys", async () => {
  const cache = new FeatureCache(await mkdtemp(join(tmpdir(), "lyricsync-cache-invalid-")));
  await assert.rejects(() => cache.get("not-a-key"), /SHA-256/u);
});
