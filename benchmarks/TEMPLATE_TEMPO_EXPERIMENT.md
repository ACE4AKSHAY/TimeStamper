# Experiment 14 — template-DTW tempo robustness

## Question

How tolerant is reference-template MFCC/DTW alignment when the target is 25%
faster or slower than the reference? The target frames are deterministically
resampled from the checked-in synthetic templates; no copyrighted audio is
used.

## Search

The runner evaluates tempo scales `0.75`, `1.00`, and `1.25` across both
template fixtures, using DTW windows `0`, `1`, and `2`. It scores line starts
with MAE, median absolute error, RMSE, and threshold accuracy.

## Interpretation limits

Time-resampled feature vectors are not real singing. This experiment measures
DTW path tolerance only; it cannot answer whether MFCC templates survive a
different singer, key, arrangement, language, or instrumental recording.

## Reproduce

```powershell
$env:Path = 'C:\Users\aksha\AppData\Local\nvm\v22.23.2;' + $env:Path
npm run experiment-template-tempo
```

The generated JSON is written to the ignored `benchmarks/results/` directory.
