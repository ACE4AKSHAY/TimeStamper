# Experiment 29 — template-boundary margin gate

## Purpose

The first boundary-refinement run moved many boundaries because any tiny local
DTW improvement was accepted. This experiment adds an optional normalized
improvement threshold so small acoustic differences can be rejected.

## Implementation

`src/template-boundary-refiner.js` now accepts `minImprovementRatio`. The raw
candidate shift and its ratio are recorded. A shift is applied only if the
ratio reaches the configured threshold. The reference-template adapter exposes
this as `templateBoundaryMinImprovementRatio`, defaulting to `0` to preserve
the prior opt-in behavior.

## Bounded sweep

The same first five reviewed recordings were evaluated with banded DTW,
cached MFCC frames, and radius `1`:

| Configuration | MAE | Median | Within 250 ms | Within 500 ms | Boundaries moved |
|---|---:|---:|---:|---:|---:|
| Radius 0 baseline | 17.66 ms | 9.98 ms | 99.59% | 100% | 0 |
| Radius 1, ratio 0.01 | 14.03 ms | 5.22 ms | 99.59% | 100% | 192 |
| Radius 1, ratio 0.05 | 14.30 ms | 5.22 ms | 99.59% | 100% | 168 |
| Radius 1, ratio 0.10 | 14.77 ms | 5.22 ms | 99.59% | 100% | 136 |

This small sweep does not establish a production threshold. It shows that the
gate controls aggressiveness, while all tested thresholds retained the same
strict coverage on this subset. The full 20-case radius-1 run still had mixed
outcomes, so both radius and gate remain experimental.

## Reproduction

```powershell
$env:LYRICSYNC_DTW_IMPLEMENTATION = "banded"
$env:LYRICSYNC_TEMPLATE_BOUNDARY_RADIUS = "1"
$env:LYRICSYNC_TEMPLATE_BOUNDARY_MIN_IMPROVEMENT_RATIO = "0.05"
& "C:\Users\aksha\AppData\Local\nvm\v22.23.2\node.exe" scripts/evaluate-reference-template-cases.mjs `
  "C:\Users\aksha\Desktop\TimeStamper_Manual_Review_2026-08-29" `
  "benchmarks/private/reference-template-margin-r005-5.json" 5
```

