# Experiment 26 — rolling-cost constrained DTW

## Question

Can constrained DTW keep the same result while using less memory on long audio
feature sequences?

## Algorithm

`src/dtw.js` is the reference implementation and stores the complete cost and
parent matrices. `src/dtw-banded.js` keeps only two floating-point cost rows and
one-byte parent directions for the permitted Sakoe–Chiba band. It preserves the
reference tie order (diagonal, up, left), so equivalence is testable rather than
assumed. Both implementations are deterministic and do not use AI/ML.

The optimized implementation is intentionally not wired into the production
engine default yet. `alignMfccSequences` and `alignLineTemplates` now accept
`implementation: "banded"` / `dtwImplementation: "banded"` for opt-in trials.
The full-matrix implementation remains the reference until longer,
rights-cleared recordings confirm equivalence and memory savings. The
reference-template adapter forwards the same option, and the local runner
accepts `LYRICSYNC_DTW_IMPLEMENTATION=banded` for an end-to-end trial.

## Files

| File | Role |
| --- | --- |
| `src/dtw.js` | Existing full-matrix reference. |
| `src/dtw-banded.js` | Rolling-cost, band-limited candidate. |
| `scripts/run-dtw-performance-experiment.mjs` | Synthetic runtime/equivalence comparison. |
| `test/dtw-banded.test.mjs` | Exact path/cost and invalid-window coverage. |

## Reproduce

```powershell
$env:Path = 'C:\Users\aksha\AppData\Local\nvm\v22.23.2;' + $env:Path
npm run experiment-dtw-performance
```

The generated JSON is written to ignored `benchmarks/results/`.

## Current fixture result

All three tested sequence lengths produced identical costs and path lengths.
The rolling-cost implementation took approximately 1.0 ms, 0.45 ms, and 0.88
ms for lengths 64, 128, and 256, compared with 2.9 ms, 2.0 ms, and 4.7 ms for
the full-matrix reference. This is a small synthetic timing only; memory and
long-song behavior still need measurement before production integration.
