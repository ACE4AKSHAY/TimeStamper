# Experiment 22 — Silence-aware Boundary-DP

## Question

Can pause evidence improve line boundaries when phrases are separated by quiet
gaps or short instrumental breaks?

## Algorithm

`src/silence-aware-aligner.js` adds a local boundary score to the existing
duration optimizer. It combines onset strength, quiet-gap strength, and the
strongest activity shortly after a candidate. The lookahead prevents a long
silent region from winning solely because it is quiet. Minimum and maximum
segment lengths preserve monotonic editable output.

This is an acoustic heuristic, not voice recognition. A quiet gap may be an
instrumental passage, a breath, or a recording artifact, so the engine remains
selectable and is not the default.

## Code and runner

| File | Role |
| --- | --- |
| `src/silence-aware-aligner.js` | Pause/onset-aware dynamic-programming aligner. |
| `src/engine.js` | Selectable `engine: "silence-aware-boundary-dp"` entry point. |
| `scripts/run-silence-aware-experiment.mjs` | Ordinary versus pause-aware comparison. |
| `benchmarks/example.silence-aware.synthetic.json` | English, Telugu and Hindi pause fixture. |

Run it with:

```powershell
$env:Path = 'C:\Users\aksha\AppData\Local\nvm\v22.23.2;' + $env:Path
npm run experiment-silence-aware
```
