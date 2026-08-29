import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createAudioFeatureCacheKey, createFeatureCacheKey, FeatureCache } from "../src/feature-cache.mjs";
import { loadOrExtractAudioFeatures } from "../src/audio-feature-cache.mjs";
import { loadOrExtractMfcc } from "../src/mfcc-feature-cache.mjs";

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

test("audio feature extraction reuses a cached profile and supports opt-out", async () => {
  const root = await mkdtemp(join(tmpdir(), "lyricsync-feature-cache-"));
  const audioPath = join(root, "fixture.wav");
  await writeFile(audioPath, "fixture");
  const cache = new FeatureCache(join(root, "cache"));
  const decoded = { samples: Float64Array.from({ length: 4096 }, (_, index) => Math.sin(index / 11)), sampleRate: 8000, duration: 4096 / 8000 };
  const first = await loadOrExtractAudioFeatures({ audioPath, decoded, cache });
  const second = await loadOrExtractAudioFeatures({ audioPath, decoded, cache });
  const uncached = await loadOrExtractAudioFeatures({ audioPath, decoded, cache, enabled: false });
  assert.equal(first.cache.hit, false);
  assert.equal(second.cache.hit, true);
  assert.equal(second.cache.key, first.cache.key);
  assert.equal(uncached.cache.enabled, false);
  assert.equal(uncached.cache.key, null);
  assert.deepEqual(second.profiles, first.profiles);
  assert.deepEqual(second.voicedness, first.voicedness);
});

test("MFCC cache reuses whole-recording frames with extraction identity", async () => {
  const root = await mkdtemp(join(tmpdir(), "lyricsync-mfcc-cache-"));
  const audioPath = join(root, "fixture.wav");
  await writeFile(audioPath, "fixture");
  const cache = new FeatureCache(join(root, "cache"));
  const decoded = { samples: Float64Array.from({ length: 4096 }, (_, index) => Math.sin(index / 13)), sampleRate: 8000, duration: 4096 / 8000 };
  const first = await loadOrExtractMfcc({ audioPath, decoded, cache, options: { frameSize: 128, hopSize: 64, melBands: 12, coefficients: 6 } });
  const second = await loadOrExtractMfcc({ audioPath, decoded, cache, options: { frameSize: 128, hopSize: 64, melBands: 12, coefficients: 6 } });
  assert.equal(first.cache.hit, false);
  assert.equal(second.cache.hit, true);
  assert.deepEqual(second.frames, first.frames);
  assert.equal(second.frameRate, first.frameRate);
});
