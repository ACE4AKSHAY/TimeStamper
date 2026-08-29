# Experiment 24 — Full deterministic engine comparison

## Question

Do the newer alignment candidates generalize beyond their focused synthetic
fixtures, or do they only win on specially constructed examples?

## Method

`scripts/run-full-engine-comparison.mjs` creates a new seeded 60-case corpus
with variable line counts, uneven durations, leading intros, onset shifts, and
bounded profile noise. It compares every current deterministic candidate:
energy, combined profile, Boundary-DP, multi-profile, text-weighted,
refined, vocal-gated, adaptive-vocal, ensemble, and silence-aware.

The output is metrics and a ranking only. It contains no audio or lyric text.
The corpus is synthetic; ranking is a development signal, not a real-song
accuracy claim.

## Run

```powershell
$env:Path = 'C:\Users\aksha\AppData\Local\nvm\v22.23.2;' + $env:Path
npm run experiment-full-engine
```

The generated JSON is ignored under `benchmarks/results/`.
