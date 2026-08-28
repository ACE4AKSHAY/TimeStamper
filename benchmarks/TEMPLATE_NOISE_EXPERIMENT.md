# Experiment 15 — template-DTW noise and frame-drop robustness

## Question

How does reference-template MFCC/DTW alignment behave when extracted feature
vectors contain bounded noise or missing frames? This follows the tempo study
and keeps the original template engine unchanged.

## Search

The runner evaluates noise amplitudes `0`, `0.05`, `0.15`, and `0.30`, frame
drop rates `0` and `0.10`, and DTW windows `0` through `3` across both checked-
in synthetic template fixtures. It records line-start MAE, RMSE, and threshold
accuracy for every window.

## Interpretation limits

The perturbations are numerical, deterministic feature edits—not real
microphone noise, different singers, or instrumental mixes. The results show
DTW sensitivity only and cannot establish real-song accuracy.

## Reproduce

```powershell
$env:Path = 'C:\Users\aksha\AppData\Local\nvm\v22.23.2;' + $env:Path
npm run experiment-template-noise
```

The generated JSON is written to the ignored `benchmarks/results/` directory.
