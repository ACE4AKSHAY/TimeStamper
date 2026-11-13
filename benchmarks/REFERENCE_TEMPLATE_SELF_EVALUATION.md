# Experiment 27 — reference-template self-alignment

## Question

Can the reusable reference-assisted MFCC/DTW pipeline reproduce a verified
timeline when the reference and target are the same recording, and can the
memory-saving banded DTW implementation handle the private review set?

## Inputs and privacy

- Input root: the user-supplied local review folder ending in
  `manual-review-2026-08-29`.
- 20 case folders, 20 MP3 files, 1,114 lyric lines in total.
- Each case contains a `reference.json` marked as manually verified.
- The generated report contains only local paths, configuration, timestamps,
  diagnostics, and metrics. Audio and lyric text are not copied to Git.
- The report is ignored at
  `benchmarks/private/reference-template-self-evaluation-banded.json`.

## Method

1. Decode each MP3 to mono Float32 PCM through the local FFmpeg executable.
2. Cut one MFCC template per lyric line using the verified reference start
   times.
3. Extract MFCC frames from the target recording.
4. Search monotonic line segments with duration/anchor constraints.
5. Score each candidate with **banded rolling-cost DTW** instead of storing a
   full cost matrix.
6. Compare the generated starts with the same verified starts.

The evaluator now accepts the same environment switches as the standalone
reference runner:

```powershell
$env:LYRICSYNC_DTW_IMPLEMENTATION = 'banded'
$env:LYRICSYNC_REFERENCE_ANCHORS = '1'
```

## Result

| Measure | Result |
| --- | ---: |
| Cases evaluated | 20/20 |
| Lyric lines | 1,114 |
| Mean absolute error | 29.2 ms |
| Median absolute error | 11.9 ms |
| Lines within 250 ms | 98.56% |
| Lines within 500 ms | 99.46% |
| Lines within 1 second | 100% |
| Total alignment time | approximately 470.5 s |
| Per-case time | approximately 15–33 s |

## Interpretation

This is a successful **implementation sanity check**, not a claim of
generalization. The reference and target are identical, so the acoustic
templates are expected to match. The small residual error is primarily frame
quantization and constrained search resolution.

The run also exposes the next optimization target: even banded DTW is too
slow for an interactive button when processing a full collection. The desktop
UI should remain on the instant energy baseline for now. A future reference
mode should run asynchronously with progress, cache MFCC/features, and process
one selected song at a time. Separate target recordings are required before
we can measure whether this method solves tempo, arrangement, cover, or
background-vocal variation.

## Reproduction

```powershell
Set-Location '$env:LYRICSYNC_REPO_DIR'
$ffDir = 'ffmpeg-on-PATH'
$env:LYRICSYNC_DTW_IMPLEMENTATION = 'banded'
node scripts/evaluate-reference-template-cases.mjs `
  '$env:LYRICSYNC_REVIEW_DIR' `
  'benchmarks/private/reference-template-self-evaluation-banded.json'
```
