# Experiment 05 — Autocorrelation pitch/F0 profile

## Question

Can a bounded, explainable autocorrelation estimator identify voiced fundamental frequency and silence without a learned model?

## Algorithm

`src/pitch-profile.js` divides PCM samples into overlapping frames, removes the frame mean, searches autocorrelation lags between configured minimum and maximum frequencies, and reports the strongest normalized correlation. Frames below the voicing threshold are marked unvoiced. The module also exposes a voicedness-only profile for future feature fusion.

## Code and runner

| File | Role |
| --- | --- |
| `src/pitch-profile.js` | Independent pitch/F0 and voicedness extractor. |
| `scripts/run-pitch-experiment.mjs` | Generates deterministic tone/silence samples and reports frequency/silence metrics. |
| `benchmarks/example.pitch.synthetic.json` | Synthetic frequency-segment fixture. |

## Result of the wiring experiment

Run:

```powershell
$env:Path = 'C:\Users\aksha\AppData\Local\nvm\v22.23.2;' + $env:Path
& 'C:\Users\aksha\AppData\Local\nvm\v22.23.2\node.exe' scripts/run-pitch-experiment.mjs
```

The current fixture reports 0 Hz mean frequency error across 48 voiced frames and a 0% false-voiced rate for silence. This is a controlled signal check, not evidence that singing pitch will be estimated equally well.

## What this can and cannot do

Pitch is useful evidence for voiced regions, but it does not identify words, lyric language, line boundaries, or instrumental versus vocal recordings on its own. Polyphonic mixes, vibrato, breathiness, percussion, accompaniment, and octave errors are expected real-world failure modes.

## Keep or discard rule

Keep the extractor and its measurements as an independent experiment. Later analysis may use only its voicedness profile, combine it with energy/spectral flux, or reject it if real-song error and runtime are poor. Do not delete it merely because another feature wins.

## Future work

Measure octave error and voiced/unvoiced precision on rights-cleared vocal samples, add optional parabolic lag refinement, and test pitch-derived profiles with the boundary-DP and combined-profile engines.
