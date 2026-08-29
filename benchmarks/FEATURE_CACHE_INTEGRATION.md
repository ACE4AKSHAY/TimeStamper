# Feature-cache integration

The local alignment and private real-case evaluation scripts now reuse the
deterministic audio features they already compute: normalized RMS energy,
spectral flux, pitch frames, and the derived voicedness profile.

## Why this exists

Audio decoding must still happen on each run so duration and sample rate remain
authoritative, but profile extraction and bounded pitch estimation can be much
more expensive than the alignment itself. Reusing those arrays makes parameter
sweeps and repeated experiments faster without changing the algorithm result.

## How it is linked

`src/audio-feature-cache.mjs` is the shared adapter. It combines the audio
absolute path, file size, modification time, sample rate, and every extraction
setting into a SHA-256 identity. A cache miss calls the existing
`audio-profiles.js` and `pitch-profile.js` modules, then writes only derived
JSON arrays through `FeatureCache`. A hit returns the same shape, so the
alignment engine receives no special cache-specific inputs.

The cache is enabled by default in:

- `scripts/run-local-alignment.mjs`
- `scripts/evaluate-real-cases.mjs`

Entries live under the ignored `cache/features` directory unless
`LYRICSYNC_FEATURE_CACHE_DIR` points elsewhere. Source audio, decoded PCM, and
lyric text are never copied into the cache. Set
`LYRICSYNC_DISABLE_FEATURE_CACHE=1` for a clean uncached comparison.

## Reproducibility and invalidation

Replacing or editing an audio file changes its size or modification time and
therefore creates a new key. Changing frame size, hop size, profile bins, or
pitch bounds also creates a new key. The cache is an optimization only; deleting
the ignored `cache/features` folder cannot affect source files or project data.
