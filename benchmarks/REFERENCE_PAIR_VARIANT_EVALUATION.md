# Alternate-recording variant evaluation

The pair evaluator now accepts the current experimental options through
environment variables. This keeps algorithm comparisons reproducible when a
verified reference/target pair is available, without editing the runner for
each experiment.

Supported options:

| Environment variable | Meaning |
|---|---|
| `LYRICSYNC_DTW_IMPLEMENTATION=banded` | Use memory-efficient banded DTW. |
| `LYRICSYNC_REFERENCE_ANCHORS=0` | Test anchor-free target search. |
| `LYRICSYNC_REFERENCE_ANCHOR_SCALE=duration-ratio` | Scale reference timing by total duration. |
| `LYRICSYNC_TEMPLATE_BOUNDARY_RADIUS=1` | Enable local template-boundary refinement. |
| `LYRICSYNC_TEMPLATE_BOUNDARY_MIN_IMPROVEMENT_RATIO=0.05` | Require a normalized local cost improvement. |
| `LYRICSYNC_FEATURE_NORMALIZATION=global-zscore` | Enable the isolated MFCC normalization experiment. |
| `LYRICSYNC_TEMPLATE_ENSEMBLE=1` | Run anchored, anchor-free, and boundary-refined variants as an ensemble. |
| `LYRICSYNC_ENSEMBLE_WEIGHT_BY_CONFIDENCE=1` | Use candidate confidence as ensemble influence. |
| `LYRICSYNC_ENSEMBLE_CLUSTER_TOLERANCE=0.25` | Cluster nearby hypotheses before consensus and report outliers. |

The output records the effective configuration, confidence diagnostics,
failure categories, and boundary-refinement summary. It still requires two
independently verified timestamp documents and does not copy source media or
lyric text into Git.

Example:

```powershell
$env:LYRICSYNC_DTW_IMPLEMENTATION = "banded"
$env:LYRICSYNC_TEMPLATE_BOUNDARY_RADIUS = "1"
$env:LYRICSYNC_TEMPLATE_BOUNDARY_MIN_IMPROVEMENT_RATIO = "0.05"
$env:LYRICSYNC_TEMPLATE_ENSEMBLE = "1"
$env:LYRICSYNC_ENSEMBLE_CLUSTER_TOLERANCE = "0.25"
& "C:\Users\aksha\AppData\Local\nvm\v22.23.2\node.exe" scripts/evaluate-reference-template-pairs.mjs `
  "benchmarks/private/reference-template-pairs" `
  "benchmarks/private/reference-template-pairs-refined.json"
```
