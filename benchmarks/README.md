# Benchmark dataset

## Experiment documents

- [`ENERGY_BASELINE_EXPERIMENT.md`](./ENERGY_BASELINE_EXPERIMENT.md) — Experiment 01, RMS baseline.
- [`COMBINATION_EXPERIMENT.md`](./COMBINATION_EXPERIMENT.md) — Experiment 02, weighted RMS + spectral flux.
- [`MFCC_DTW_EXPERIMENT.md`](./MFCC_DTW_EXPERIMENT.md) — Experiment 03, acoustic-template MFCC + constrained DTW.
- [`BOUNDARY_DP_EXPERIMENT.md`](./BOUNDARY_DP_EXPERIMENT.md) — Experiment 04, duration/onset dynamic programming.

The checked-in `example.synthetic.json` is only a deterministic smoke fixture; it contains no copyrighted audio. A research dataset is needed to answer whether the algorithm works. It should be kept outside Git unless every audio/lyric item is licensed for redistribution.

Each real case should have:

```text
case-id/
  audio.mp3              # rights-cleared or locally referenced, not committed
  lyrics.txt              # UTF-8, supplied lyrics
  reference.json          # manually verified line start times
  metadata.json           # language, genre, duration, recording type, difficulty
```

`reference.json` should contain `startTime` values in seconds and a note about who/when verified them. Do not use an automatically generated LRC as ground truth. Begin with a small, balanced set (for example 20–30 tracks across languages and recording conditions), then grow it after the measurement process is stable. The application itself does not need a dataset for manual editing or normal offline use; the dataset is needed for scientific evaluation and regression testing.

For a local collection audit (the output is ignored by Git), run `npm run audit-library -- "C:\\Users\\aksha\\Music"`. The manifest records relative paths, timestamp coverage, exact filename candidates and likely instrumental hints. It cannot prove that a lyric file matches the recording or that timestamps are correct; those decisions remain manual.

Run the synthetic smoke benchmark with:

```powershell
$env:Path = 'C:\Users\aksha\AppData\Local\nvm\v22.23.2;' + $env:Path
& 'C:\Users\aksha\AppData\Local\nvm\v22.23.2\node.exe' scripts/run-benchmark.mjs benchmarks/example.synthetic.json
```

Compare the deterministic energy baseline with the explainable weighted profile engine:

```powershell
$env:Path = 'C:\Users\aksha\AppData\Local\nvm\v22.23.2;' + $env:Path
& 'C:\Users\aksha\AppData\Local\nvm\v22.23.2\node.exe' scripts/run-engine-comparison.mjs benchmarks/example.synthetic.json
```

The comparison consumes explicit `energy` and `spectralFlux` arrays, normalizes each to 0..1, fuses them using documented weights, and reports the same timestamp metrics for both methods. Results are generated under `benchmarks/results/`, which is ignored by Git. Synthetic results validate wiring only; real accuracy requires rights-cleared audio and manually checked line starts.
