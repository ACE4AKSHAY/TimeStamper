# Experiment 18 — Coarse-to-fine boundary refinement

## Question

Can a small local search correct frame-level boundary errors left by a global
segmentation without breaking monotonic line order?

## Algorithm

`src/boundary-refiner.js` accepts any valid coarse segmentation and searches a
bounded neighborhood around each internal boundary. Candidates are scored by
positive onset strength, a local peak contrast, and a small movement penalty.
The best candidate is selected deterministically; the score margin becomes an
explainable confidence signal. Minimum gaps preserve editable, ordered lines.

The engine entry point `engine: "refined-boundary-dp"` currently uses the
adaptive Boundary-DP result as its coarse input, then applies this local pass.
The original engines remain available and unchanged.

## Code and runner

| File | Role |
| --- | --- |
| `src/boundary-refiner.js` | Reusable local refinement and confidence calculation. |
| `src/engine.js` | Selectable `refined-boundary-dp` engine. |
| `scripts/run-boundary-refinement-experiment.mjs` | Synthetic comparison runner. |
| `benchmarks/example.refinement.synthetic.json` | English, Telugu, and Hindi onset fixture. |

## Interpretation

This pass can improve small timing errors when an onset peak is nearby, but it
cannot recover a completely missing vocal phrase or identify lyrics. A large
search window can move a correct boundary to an unrelated beat, so the window
and confidence margin must be calibrated on verified recordings.

Run it with:

```powershell
$env:Path = 'C:\Users\aksha\AppData\Local\nvm\v22.23.2;' + $env:Path
npm run experiment-boundary-refinement
```
