# Experiment 16 — MFCC parameter sensitivity

## Question

Does self-alignment depend strongly on one MFCC frame size, hop size, or mel
filter-bank count? This experiment generates a deterministic four-tone signal,
builds line templates from known boundaries, and aligns the same signal through
the public template-MFCC-DTW engine.

## Search

It evaluates 18 combinations of frame sizes `256/512/1024`, hop sizes
`128/256`, and mel-band counts `20/26/40` using 13 coefficients. Each result
records frame counts, template lengths, DTW cost, and line-start metrics.

## Interpretation limits

This is a self-alignment and feature-configuration check, not a singer,
language, or recording benchmark. A parameter combination that works on these
tones is not automatically the best choice for real music.

## Reproduce

```powershell
$env:Path = 'C:\Users\aksha\AppData\Local\nvm\v22.23.2;' + $env:Path
npm run experiment-mfcc-parameters
```

The generated JSON is written to the ignored `benchmarks/results/` directory.
