# Experiment 06 — Multi-profile boundary combination

## Question

Does combining three independent, explainable signals—RMS energy, spectral flux, and pitch voicedness—help the boundary-DP optimizer choose line starts?

## Algorithm

`src/multi-profile-aligner.js` fuses named profiles with explicit weights (default energy 0.5, spectral flux 0.3, voicedness 0.2), then sends the fused profile to the preserved boundary dynamic-programming engine. The component profiles and weights are retained in the result for inspection.

## Code and runner

| File | Role |
| --- | --- |
| `src/multi-profile-aligner.js` | Independent adapter joining profile fusion and boundary DP. |
| `src/profile-fusion.js` | Resampling, normalization, and weighted fusion. |
| `src/boundary-dp-aligner.js` | Monotonic duration/onset optimizer. |
| `src/engine.js` | Reusable `engine: "multi-profile-boundary-dp"` entry point. |
| `scripts/run-multi-profile-experiment.mjs` | Synthetic comparison runner. |
| `benchmarks/example.multi-profile.synthetic.json` | Three-profile Unicode fixture. |

## Result of the wiring experiment

Run:

```powershell
$env:Path = 'C:\Users\aksha\AppData\Local\nvm\v22.23.2;' + $env:Path
& 'C:\Users\aksha\AppData\Local\nvm\v22.23.2\node.exe' scripts/run-multi-profile-experiment.mjs
```

The current synthetic fixture reports 0.400 seconds MAE across five starts, with 60% within 0.25 seconds and 100% within 1 second. This is a wiring fixture, not a claim that three features improve real recordings; its value is preserving a reproducible combination for later analysis.

## Keep or discard rule

Keep energy, spectral flux, pitch, profile fusion, boundary DP, and this adapter as separate code. Later evaluation may change weights, remove a weak component from a selected configuration, or keep multiple modes for different recording conditions. No source experiment is deleted because another configuration wins.

## Future work

Run ablations (one feature removed at a time), tune weights only on a training split, measure runtime, and evaluate on manually verified vocal recordings before exposing this mode in the UI.
