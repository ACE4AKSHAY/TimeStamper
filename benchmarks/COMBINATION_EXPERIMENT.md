# Explainable profile-combination experiment

## Purpose

The first automatic layer used only RMS energy. The next isolated experiment combines two measurable signals—RMS energy and spectral flux—to test whether changes in the audio help produce better editable line-start estimates. This is an algorithmic heuristic, not AI or machine learning: there are no learned weights, model files, transcripts, or network calls.

## Data flow

```text
PCM samples (future audio adapter)
       ├── RMS energy profile
       └── spectral-flux profile
                 ↓
     resample + min/max normalize each profile
                 ↓ explicit weights (default 0.65 / 0.35)
          fused activity profile
                 ↓
       monotonic editable line timeline
                 ↓
             LRC/export/review
```

## Code ownership

| File | Responsibility |
| --- | --- |
| `src/audio-profiles.js` | Extracts finite RMS and spectral-flux profiles from PCM samples. |
| `src/features.js` | Supplies the pure-JavaScript FFT magnitude primitive used by spectral flux and MFCC. |
| `src/profile-fusion.js` | Resamples, normalizes, and combines named profiles with explicit weights. |
| `src/combined-aligner.js` | Feeds the fused profile into the existing monotonic energy timeline heuristic. |
| `src/engine.js` | Exposes the reusable `engine: "combined-profile"` entry point. |
| `scripts/run-engine-comparison.mjs` | Runs baseline-vs-combination metrics on a deterministic fixture. |
| `benchmarks/example.synthetic.json` | Contains Unicode synthetic cases with energy and spectral-flux arrays; no copyrighted media. |

## Interpretation and limits

The engine knows how many lyric lines exist and preserves their order. It does not understand lyric meaning, identify languages, transcribe vocals, or prove that a recording is vocal. A combined profile can only improve boundary candidates when its signals correlate with sung activity. Every generated timestamp remains editable and must be reviewed before it becomes ground truth.

## Next experiment steps

1. Add a small rights-cleared set with manually verified line starts.
2. Extract both profiles from the same audio preprocessing path.
3. Run the comparison script with fixed weights and record MAE/median/RMSE/runtime.
4. Tune weights only on a training split; report untouched validation results.
5. Add confidence margins and failure categories before considering vocal separation.
