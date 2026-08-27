# Experiment 03 — Acoustic-template MFCC + constrained DTW

## Question

When an acoustic feature template is available for each lyric line, can constrained Dynamic Time Warping find monotonic line segments in a target recording?

## Important boundary

The algorithm does **not** turn text into audio and does not perform speech recognition. A line template must already be an acoustic feature sequence. Templates may eventually come from a manually aligned reference recording or a separate local feature-extraction workflow.

## Algorithm

1. Represent each line with a numeric feature template.
2. Try candidate target segments subject to minimum/maximum frame lengths.
3. Score each candidate with constrained DTW.
4. Use monotonic dynamic programming to choose one complete, non-overlapping path.
5. Convert frame boundaries to seconds and retain per-segment costs.

## Code and runner

| File | Role |
| --- | --- |
| `src/features.js` | Pure-JS MFCC/FFT primitives. |
| `src/dtw.js` | Window-constrained DTW and path reconstruction. |
| `src/mfcc-dtw.js` | Feature-sequence adapter and metadata. |
| `src/template-aligner.js` | Monotonic line-level segmentation using template costs. |
| `src/engine.js` | Reusable `engine: "template-mfcc-dtw"` entry point. |
| `scripts/run-template-dtw-experiment.mjs` | Fixture runner and timestamp metrics. |
| `benchmarks/example.template.synthetic.json` | Unicode synthetic acoustic-template fixture. |

## Result of the wiring experiment

Run:

```powershell
$env:Path = 'C:\Users\aksha\AppData\Local\nvm\v22.23.2;' + $env:Path
& 'C:\Users\aksha\AppData\Local\nvm\v22.23.2\node.exe' scripts/run-template-dtw-experiment.mjs
```

The current synthetic fixture reports zero timestamp error because it deliberately contains matching templates and target frames. That validates implementation wiring only; it is not evidence of real-song accuracy.

## Keep or discard rule

Keep this experiment as an independent engine even if it loses to another method. Its usefulness can be judged later by accuracy, runtime, template cost, and how reliably templates can be acquired without machine learning.

## Future work

Create templates from rights-cleared, manually verified audio; add confidence margins; test window/length sensitivity; and compare full-mix versus vocal-assisted input without changing this core implementation.
