# Experiment 04 — Boundary dynamic programming

## Question

Can a deterministic optimizer choose lyric boundaries that balance expected line duration with observable onset-like changes in an audio activity profile?

## Algorithm

`src/boundary-dp-aligner.js` normalizes one activity profile, then uses dynamic programming to choose a complete monotonic segmentation. Each candidate segment pays a duration-deviation cost and receives a reward when its start coincides with a positive profile change. Minimum and maximum segment lengths prevent impossible or wildly uneven solutions.

## Code and runner

| File | Role |
| --- | --- |
| `src/boundary-dp-aligner.js` | Independent duration/onset dynamic-programming aligner. |
| `src/engine.js` | Reusable `engine: "boundary-dp"` entry point. |
| `scripts/run-boundary-dp-experiment.mjs` | Fixture runner and timestamp metrics. |
| `benchmarks/example.boundary.synthetic.json` | Unicode synthetic profile fixture. |

## Result of the wiring experiment

Run:

```powershell
$env:Path = 'C:\Users\aksha\AppData\Local\nvm\v22.23.2;' + $env:Path
& 'C:\Users\aksha\AppData\Local\nvm\v22.23.2\node.exe' scripts/run-boundary-dp-experiment.mjs
```

The current synthetic fixture reports zero error because its profile peaks are intentionally placed at the reference boundaries. This verifies path constraints and output wiring, not real-song accuracy.

## Keep or discard rule

Keep this implementation alongside every other engine. Later analysis may show that duration priors help, hurt, or should be combined with profile fusion. It should only be removed after an explicit comparison demonstrates that it is unusable and the history has preserved the reason.

## Future work

Add silence-aware costs, line-length priors from verified lyrics, confidence margins, and comparisons against energy, combined profiles, and template MFCC/DTW on real verified pairs.
