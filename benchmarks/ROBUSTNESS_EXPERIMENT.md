# Experiment 08 — synthetic robustness and failure modes

## Question

How do the current non-ML engines behave when the clean synthetic assumptions
are perturbed? This experiment is deliberately separate from the earlier
fixtures so that improvements or regressions do not overwrite prior evidence.

## Scenarios

The runner creates five deterministic, non-copyrighted cases with five lyric
lines each:

| Scenario | Stress applied |
| --- | --- |
| `clean` | Exact onset peaks at the known line boundaries. |
| `deterministic-noise` | Bounded, repeatable noise added to all profiles. |
| `delayed-onsets` | Profile peaks delayed by two frames relative to the reference. |
| `long-intro` | First lyric starts after ten low-activity frames. |
| `uneven-line-lengths` | Boundaries are intentionally non-uniform. |

The same four engines are evaluated: energy baseline, combined profile,
boundary dynamic programming, and multi-profile boundary DP. Metrics are line
start MAE, median absolute error, RMSE, and threshold accuracy.

## Latest synthetic result

Across 25 line starts (five scenarios), the aggregate MAE was:

| Engine | MAE | Within 1 s |
| --- | ---: | ---: |
| Energy baseline | 0.635 s | 88% |
| Combined profile | 0.286 s | 100% |
| Boundary DP | 0.360 s | 96% |
| Multi-profile boundary DP | 0.360 s | 96% |

The scenario-level failures are the important result: a long intro produced a
5-second first-line error for boundary DP, and delayed onsets produced roughly
0.8-second MAE for boundary DP. Uneven line lengths were handled exactly by
boundary DP in this fixture. The combined profile was strongest overall here,
but this does not overturn the earlier ablation result or establish real-song
accuracy.

## Interpretation limits

This is still a synthetic stress test. It reveals sensitivity to timing drift,
noise, intros, and duration assumptions, but it does not contain a vocal
waveform, phonetics, language variation, or a verified LRC. Real-song claims
remain gated on manually verified private recordings.

## Reproduce

```powershell
$env:Path = 'C:\Users\aksha\AppData\Local\nvm\v22.23.2;' + $env:Path
npm run experiment-robustness
```

The generated JSON is written to the ignored `benchmarks/results/` directory.
Add its findings to the checked-in results audit only after reviewing the
scenario-level metrics; generated media and private data must never be added.
