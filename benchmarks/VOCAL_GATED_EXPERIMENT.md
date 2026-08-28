# Experiment 20 — Vocal-gated Boundary-DP

## Question

Can an explainable voicedness signal reduce false lyric boundaries caused by
instrumental energy peaks?

## Algorithm

`src/vocal-gated-aligner.js` normalizes and resamples energy and voicedness
profiles to one frame grid. It multiplies energy by a voicedness gate with a
small floor, then passes the gated activity to the existing adaptive
Boundary-DP optimizer. The floor keeps breathy or imperfectly detected vocals
from being removed completely. Pitch/voicedness is derived by the existing
autocorrelation profile and is not a learned model.

## Code and runner

| File | Role |
| --- | --- |
| `src/vocal-gated-aligner.js` | Gated profile construction and selectable aligner. |
| `src/engine.js` | `engine: "vocal-gated-boundary-dp"` entry point. |
| `scripts/run-vocal-gated-experiment.mjs` | Energy-only versus gated comparison. |
| `benchmarks/example.vocal-gated.synthetic.json` | Instrumental-decoy fixture with English, Telugu and Hindi lines. |

The gate is a heuristic. It can fail on unvoiced singing, humming, heavy
autotune, or instrumental sections with pitch-like content. Real songs are
needed to tune `gateFloor` and confirm whether it improves special-version
handling.

Run it with:

```powershell
$env:Path = 'C:\Users\aksha\AppData\Local\nvm\v22.23.2;' + $env:Path
npm run experiment-vocal-gated
```
