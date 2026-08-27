# Experiment 01 — RMS energy baseline

## Question

Can a simple local activity profile distribute existing lyric lines into an editable first timeline?

## Algorithm

`src/energy-aligner.js` estimates a low activity threshold, converts each frame to a positive weight, and places each lyric line at cumulative weighted positions. It preserves lyric order and never claims to recognize words.

## Inputs and outputs

- Input: ordered lyric lines, a one-dimensional RMS/energy profile, and audio duration.
- Output: line `startTime`, low confidence, and `alignmentMethod: "energy_baseline"`.
- No model, internet request, transcription, or vocal-separation step is used.

## Code and runner

| File | Role |
| --- | --- |
| `src/energy-aligner.js` | Baseline timing heuristic. |
| `src/engine.js` | Reusable `engine: "energy-baseline"` entry point. |
| `scripts/run-benchmark.mjs` | Metrics/resource runner. |
| `benchmarks/example.synthetic.json` | Small Unicode smoke fixture. |

## Interpretation

This is a reference baseline, not a production claim. Its value is that every later experiment can be compared against a simple, understandable method. Keep it even if a later method performs better.

## Known limits and next use

The baseline can be pulled toward instrumental energy, introductions, drum hits, or silence. Measure it on manually verified tracks before selecting or combining it with another method.
