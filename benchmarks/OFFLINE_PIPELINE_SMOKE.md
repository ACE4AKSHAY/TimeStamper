# Offline audio-to-alignment pipeline smoke test

This check exercises the real data flow without private media:

`in-memory WAV bytes → PCM decoder → RMS/spectral profiles + pitch → reusable alignment engine`.

It verifies that decoder output has the shape expected by feature extraction,
that profile frame rates can be combined, and that the platform-neutral engine
returns an ordered timeline. The generated waveform is four synthetic tones;
its timestamp metrics are only a pipeline smoke signal, not an accuracy claim.

## Reproduce

```powershell
npm run smoke-offline-pipeline
```

The generated JSON is written to the ignored `benchmarks/results/` directory.
