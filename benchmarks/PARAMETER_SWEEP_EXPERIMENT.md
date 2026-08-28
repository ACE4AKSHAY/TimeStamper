# Experiment 09 — parameter sensitivity sweep

## Question

Do the current synthetic results depend on one lucky set of weights, or are
the engines reasonably stable across nearby settings? This experiment changes
parameters only; it does not add a new production algorithm.

## Search space

- Boundary-DP: 25 combinations of `durationWeight` and `boundaryWeight`.
- Combined profile: five energy/spectral-flux weight pairs from 0.2/0.8 to
  0.8/0.2.
- Multi-profile boundary-DP: 27 combinations of energy, spectral-flux, and
  voicedness weights.

All candidates run against the checked-in `example.multi-profile.synthetic.json`
fixture (two cases, five line starts). Candidates are ranked by aggregate line
start MAE, then RMSE.

## Interpretation limits

This is a small synthetic search and can overfit the fixture. A winning
parameter set is not promoted automatically and is not evidence that the same
weights are best for real music. The purpose is to identify brittle settings
and guide future real-data evaluation.

## Reproduce

```powershell
$env:Path = 'C:\Users\aksha\AppData\Local\nvm\v22.23.2;' + $env:Path
npm run experiment-parameter-sweep
```

The generated JSON is written to the ignored `benchmarks/results/` directory.
