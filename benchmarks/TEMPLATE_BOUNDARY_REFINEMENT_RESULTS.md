# Experiment 28 — template-boundary refinement self-evaluation

## Question

Does the opt-in local MFCC/DTW boundary refinement behave deterministically on
the user's 20 manually reviewed recordings, and does it change the existing
self-reference result?

## Method

- Dataset: the 20 local reviewed case folders under
  `C:\Users\aksha\Desktop\TimeStamper_Manual_Review_2026-08-29`.
- Reference and target are intentionally the same recording. This is an
  implementation sanity check, not alternate-recording generalization.
- Banded constrained DTW, cached whole-recording MFCC frames, and verified
  reference timestamps were used.
- Baseline: `templateBoundaryRadius=0`.
- Candidate: `templateBoundaryRadius=1` frame on each side of every adjacent
  line boundary.
- No audio, lyric text, cache, or generated JSON was committed; the result is
  kept in the ignored `benchmarks/private/` directory.

## Results

| Metric | Radius 0 | Radius 1 |
|---|---:|---:|
| Cases / lines | 20 / 1,114 | 20 / 1,114 |
| Mean absolute error | 29.2 ms | 23.8 ms |
| Median absolute error | 11.9 ms | 5.7 ms |
| RMSE | 79.1 ms | 71.9 ms |
| Within 250 ms | 98.56% | 98.29% |
| Within 500 ms | 99.46% | 99.37% |
| Within 1 second | 100% | 100% |

The candidate improved 652 line errors, worsened 330, and left 132
unchanged. It changed 918 of 1,094 boundaries (83.9%); the mean reported
adjacent-pair cost improvement was 0.211 in the run's normalized DTW cost
scale.

## Interpretation

The lower MAE and median are encouraging, but the slightly lower 250/500 ms
coverage shows why this cannot become the default from self-reference alone.
The local acoustic cost can prefer a nearby split that is numerically cheaper
but less faithful to a true lyric onset. The experiment remains opt-in and
must be evaluated on independently recorded versions (cover, live, remix, or
alternate mix) before production promotion.

## Reproduction

```powershell
$env:LYRICSYNC_DTW_IMPLEMENTATION = "banded"
$env:LYRICSYNC_TEMPLATE_BOUNDARY_RADIUS = "1"
& "C:\Users\aksha\AppData\Local\nvm\v22.23.2\node.exe" scripts/evaluate-reference-template-cases.mjs `
  "C:\Users\aksha\Desktop\TimeStamper_Manual_Review_2026-08-29" `
  "benchmarks/private/reference-template-self-evaluation-refine-r1.json"
```

