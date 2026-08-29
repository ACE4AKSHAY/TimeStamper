# Experiment 23 — Adaptive vocal threshold sweep

## Question

How sensitive is coverage-based vocal-gate routing to its voicedness and
coverage thresholds?

## Method

`scripts/run-adaptive-vocal-sweep.mjs` evaluates 12 combinations of
`voicedThreshold` (0.3, 0.5, 0.7) and `minimumVoicedCoverage` (0.1, 0.2, 0.4,
0.6) on the same deterministic high-/low-coverage fixture. It records MAE,
accuracy thresholds, and whether each case gated or fell back.

This is calibration evidence only. It does not select production defaults:
the fixture is synthetic and the thresholds depend on the pitch extractor,
recording quality, singing style, and instrumentation.

## Code and output

| File | Role |
| --- | --- |
| `scripts/run-adaptive-vocal-sweep.mjs` | Reproducible threshold grid search. |
| `benchmarks/example.adaptive-vocal.synthetic.json` | Input fixture. |
| `benchmarks/results/adaptive-vocal-sweep.json` | Ignored generated result. |

Run it with:

```powershell
$env:Path = 'C:\Users\aksha\AppData\Local\nvm\v22.23.2;' + $env:Path
npm run experiment-adaptive-vocal-sweep
```
