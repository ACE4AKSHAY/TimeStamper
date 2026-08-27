# Evidence step — common ablation study

## Why this exists

The project now has several preserved algorithms, but synthetic fixtures alone cannot tell us which one works on songs. This runner creates one fair comparison surface before any method is selected, combined, or rejected.

## Compared methods

| Name | Inputs | Purpose |
| --- | --- | --- |
| `energyBaseline` | RMS energy | Simple reference baseline. |
| `combinedProfile` | RMS + spectral flux | Tests weighted profile fusion with the existing baseline. |
| `boundaryDp` | RMS energy | Tests duration/onset dynamic programming alone. |
| `multiProfileBoundaryDp` | Energy + spectral flux + voicedness | Tests the current three-feature combination. |

Every method receives the same lyric lines, duration, profiles, and reference timestamps. The runner reports MAE, median absolute error, RMSE, threshold accuracy, and each method's MAE delta versus the energy baseline.

## Run it

```powershell
$env:Path = 'C:\Users\aksha\AppData\Local\nvm\v22.23.2;' + $env:Path
& 'C:\Users\aksha\AppData\Local\nvm\v22.23.2\node.exe' scripts/run-ablation-study.mjs
```

Results are written to ignored `benchmarks/results/ablation-study.json`.

## Does this guarantee the final result?

No. It proves that the implementations can be compared consistently. Real success requires a private or rights-cleared set with manually checked line starts, multiple languages, vocal and instrumental cases, and enough variety to avoid tuning to one song. The study must be repeated on held-out tracks after any weight or parameter change.

## Selection policy

Do not delete an algorithm because it loses one fixture. Preserve every implementation and document why a configuration is preferred for a particular recording condition. A later production mode may expose several engines instead of forcing one universal choice.
