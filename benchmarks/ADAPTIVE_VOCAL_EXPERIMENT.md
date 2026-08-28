# Experiment 21 — Adaptive vocal-gate selection

## Question

When should vocal gating be trusted, and when should alignment fall back to
energy-only behavior?

## Algorithm

`src/adaptive-vocal-aligner.js` measures the fraction of voicedness frames over
a configurable confidence threshold. If coverage reaches
`minimumVoicedCoverage` (default 20%), it selects the vocal-gated engine;
otherwise it selects adaptive energy Boundary-DP. The returned selection
contains coverage, threshold, and a human-readable reason.

This is a transparent routing rule, not a learned classifier. It does not
decide whether a recording is truly vocal and should be audited on verified
real songs.

## Code and runner

| File | Role |
| --- | --- |
| `src/adaptive-vocal-aligner.js` | Voicedness coverage summary and routing rule. |
| `src/engine.js` | Selectable `engine: "adaptive-vocal-boundary-dp"` entry point. |
| `scripts/run-adaptive-vocal-experiment.mjs` | Energy baseline versus adaptive routing. |
| `benchmarks/example.adaptive-vocal.synthetic.json` | High- and low-coverage Unicode fixtures. |

Run it with:

```powershell
$env:Path = 'C:\Users\aksha\AppData\Local\nvm\v22.23.2;' + $env:Path
npm run experiment-adaptive-vocal
```
