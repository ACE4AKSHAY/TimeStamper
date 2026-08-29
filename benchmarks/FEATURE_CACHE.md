# File-backed feature cache

## Purpose

Audio decoding and MFCC/profile extraction are the most expensive repeated
steps in the algorithm experiments. `src/feature-cache.mjs` stores derived
results locally so a second engine comparison can reuse them instead of
decoding the same song again.

## Cache identity

`createAudioFeatureCacheKey()` hashes the absolute audio path, file size,
modification time, and extraction configuration. Replacing or editing an audio
file, or changing MFCC/profile settings, produces a different key and leaves
the old entry harmlessly unused. The key is a SHA-256 filename; the cache does
not copy the source audio.

## Storage and privacy

`FeatureCache` writes one JSON envelope per key under `cache/features` by
default. The directory is ignored by Git. Callers may choose a project-local
cache directory. Cache contents are derived arrays/metadata only; private
audio, lyric text, and manifests must not be placed in the value unless the
user explicitly chooses a private local cache.

Writes use a temporary file followed by replacement. A partial write therefore
cannot silently become a valid cache entry, and malformed/old entries are
treated as cache misses.

## Example

```js
const key = await createAudioFeatureCacheKey(audioPath, { sampleRate: 44100, frameSize: 512, hopSize: 256 });
const cached = await cache.get(key);
const profiles = cached || extractExplainableProfiles(samples, { bins: 700 });
if (!cached) await cache.set(key, profiles, { kind: "explainable_profiles" });
```

The cache is an infrastructure layer, not an alignment algorithm. It makes
future real-song experiments repeatable and faster while keeping the core
engine platform-neutral.
