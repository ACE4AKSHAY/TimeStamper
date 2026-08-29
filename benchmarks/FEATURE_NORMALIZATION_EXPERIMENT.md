# Experiment 30 — global MFCC feature normalization

## Question

Can a shared per-coefficient z-score transform make MFCC template matching
less sensitive to recording level and timbre differences?

## Implementation

`src/feature-normalizer.js` fits means and scales over all reference-template
and target frames, then transforms both with the same statistics. The
reference-template adapter exposes this as `featureNormalization:
"global-zscore"`; the default is `"none"`. It is language-neutral and does
not identify or transcribe text.

## Bounded result

The first five locally reviewed recordings were evaluated with cached MFCC
frames and banded DTW. The existing radius-zero, unnormalized run is the
baseline.

| Configuration | MAE | Median | Within 250 ms | Within 500 ms |
|---|---:|---:|---:|---:|
| No normalization | 17.66 ms | 9.98 ms | 99.59% | 100% |
| Global z-score | 32.74 ms | 15.19 ms | 98.37% | 99.59% |

On this self-reference subset, normalization is worse. This does not prove it
will fail on alternate recordings, but it is enough to keep it experimental
and disabled by default rather than promoting it into the main workflow.

## Interpretation limits

The reference and target are the same recording, so this is not a test of a
different singer, cover, live performance, remix, or instrumental version.
The negative result is useful evidence against blindly normalizing MFCCs and
preserves the implementation for future independent-pair testing.

## Reproduction

```powershell
$env:LYRICSYNC_DTW_IMPLEMENTATION = "banded"
$env:LYRICSYNC_FEATURE_NORMALIZATION = "global-zscore"
& "C:\Users\aksha\AppData\Local\nvm\v22.23.2\node.exe" scripts/evaluate-reference-template-cases.mjs `
  "C:\Users\aksha\Desktop\TimeStamper_Manual_Review_2026-08-29" `
  "benchmarks/private/reference-template-normalized-5.json" 5
```

