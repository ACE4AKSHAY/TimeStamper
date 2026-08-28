# Experiment 17 — Text-weighted Boundary-DP

## Question

Can lyric length provide a useful duration prior when the audio profile alone
does not reveal clear boundaries?

## Algorithm

`src/text-weighted-aligner.js` counts non-whitespace Unicode code points in
each lyric line, converts those counts to relative weights, and allocates the
available audio frames proportionally. A constrained dynamic program then
balances that expected duration against onset-like profile changes. The
language is never identified and no speech model is used, so Telugu, Hindi,
and other scripts follow the same path as Latin text.

## Code and runner

| File | Role |
| --- | --- |
| `src/text-weighted-aligner.js` | Standalone text-length estimator and Boundary-DP variant. |
| `src/engine.js` | Reusable `engine: "text-weighted-boundary-dp"` entry point. |
| `scripts/run-text-weighted-experiment.mjs` | Compares equal-duration and text-weighted priors. |
| `benchmarks/example.text-weighted.synthetic.json` | Copyright-free fixture with English and Telugu lines. |

## Interpretation

This is a prior, not lyric/audio recognition. Long written lines are not
guaranteed to take longer to sing: held notes, fast syllables, instrumental
breaks, and repeated phrases can violate the assumption. It is therefore kept
as an isolated selectable engine and is not promoted to the default.

Run it with the NVM Node runtime:

```powershell
$env:Path = 'C:\Users\aksha\AppData\Local\nvm\v22.23.2;' + $env:Path
npm run experiment-text-weighted
```

Real-song evaluation still requires your manually verified MP3/LRC pairs.
