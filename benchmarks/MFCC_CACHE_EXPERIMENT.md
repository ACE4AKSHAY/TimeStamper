# MFCC feature-cache optimization

## Purpose

Reference-template alignment needs MFCC frames for both the verified reference
recording and the target recording. Earlier runs recomputed those frames every
time. `src/mfcc-feature-cache.mjs` now stores whole-recording MFCC frames in the
existing content-identity cache, keyed by absolute path, file size, modified
time, and extraction settings.

`src/reference-template-aligner.js` accepts the cached `referenceMfcc` and
`targetMfcc` objects. When they are supplied, template lines are sliced from
the cached frame grid rather than re-running FFT/MFCC extraction. Without
those objects, the old direct-extraction behavior remains unchanged.

## Privacy and compatibility

The cache contains derived numeric features only; it does not copy audio or
lyrics and remains outside Git. The module is platform-neutral and works with
the existing Node 18+ compatibility boundary. The local evaluators now reuse
the cache automatically, with `LYRICSYNC_DISABLE_FEATURE_CACHE=1` available for
an uncached comparison.

## Interpretation

This is a runtime/repeatability optimization, not an accuracy change. The
alignment algorithm and parameters are unchanged. A meaningful speed benchmark
should be measured on the same machine before and after the first cold run and
the second warm run; real-folder alternate-recording cases are still needed to
decide whether the method is accurate enough for interactive use.
