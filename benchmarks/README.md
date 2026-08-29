# Benchmark dataset

## Experiment documents

- [`ENERGY_BASELINE_EXPERIMENT.md`](./ENERGY_BASELINE_EXPERIMENT.md) — Experiment 01, RMS baseline.
- [`COMBINATION_EXPERIMENT.md`](./COMBINATION_EXPERIMENT.md) — Experiment 02, weighted RMS + spectral flux.
- [`MFCC_DTW_EXPERIMENT.md`](./MFCC_DTW_EXPERIMENT.md) — Experiment 03, acoustic-template MFCC + constrained DTW.
- [`BOUNDARY_DP_EXPERIMENT.md`](./BOUNDARY_DP_EXPERIMENT.md) — Experiment 04, duration/onset dynamic programming.
- [`PITCH_EXPERIMENT.md`](./PITCH_EXPERIMENT.md) — Experiment 05, autocorrelation pitch/F0 profile.
- [`MULTI_PROFILE_EXPERIMENT.md`](./MULTI_PROFILE_EXPERIMENT.md) — Experiment 06, energy + spectral flux + pitch combination.
- [`ABLATION_EXPERIMENT.md`](./ABLATION_EXPERIMENT.md) — Common evidence runner comparing all current non-ML engines.
- [`REAL_DATA_EVALUATION.md`](./REAL_DATA_EVALUATION.md) — Private-library preparation, decoder boundary, and exact human-review gate.
- [`REFERENCE_TEMPLATE_EXPERIMENT.md`](./REFERENCE_TEMPLATE_EXPERIMENT.md) — Build MFCC templates from a verified reference timeline and align a target recording.
- [`RESULTS_SUMMARY.md`](./RESULTS_SUMMARY.md) — Latest checked-in audit of synthetic experiment outputs and the current real-song evidence gap.
- [`ROBUSTNESS_EXPERIMENT.md`](./ROBUSTNESS_EXPERIMENT.md) — Experiment 08, deterministic perturbations for noise, delayed onsets, intros, and uneven lines.
- [`PARAMETER_SWEEP_EXPERIMENT.md`](./PARAMETER_SWEEP_EXPERIMENT.md) — Experiment 09, synthetic parameter sensitivity for current engines.
- [`GENERALIZATION_EXPERIMENT.md`](./GENERALIZATION_EXPERIMENT.md) — Experiment 10, seeded randomized synthetic cases for broader behavior coverage.
- [`INTRO_AWARE_EXPERIMENT.md`](./INTRO_AWARE_EXPERIMENT.md) — Experiment 11, an isolated leading-intro-aware Boundary-DP variant.
- [`ADAPTIVE_BOUNDARY_EXPERIMENT.md`](./ADAPTIVE_BOUNDARY_EXPERIMENT.md) — Experiment 12, a thresholded selector between original and intro-aware Boundary-DP.
- [`CONSENSUS_CONFIDENCE_EXPERIMENT.md`](./CONSENSUS_CONFIDENCE_EXPERIMENT.md) — Experiment 13, explainable candidate aggregation and uncertainty buckets.
- [`TEMPLATE_TEMPO_EXPERIMENT.md`](./TEMPLATE_TEMPO_EXPERIMENT.md) — Experiment 14, MFCC-template DTW tolerance to controlled tempo changes.
- [`TEMPLATE_NOISE_EXPERIMENT.md`](./TEMPLATE_NOISE_EXPERIMENT.md) — Experiment 15, template-DTW sensitivity to bounded feature noise and dropped frames.
- [`MFCC_PARAMETER_EXPERIMENT.md`](./MFCC_PARAMETER_EXPERIMENT.md) — Experiment 16, self-alignment sensitivity to MFCC frame and filter-bank settings.
- [`TEXT_WEIGHTED_EXPERIMENT.md`](./TEXT_WEIGHTED_EXPERIMENT.md) — Experiment 17, a Unicode-safe lyric-length prior for Boundary-DP.
- [`BOUNDARY_REFINEMENT_EXPERIMENT.md`](./BOUNDARY_REFINEMENT_EXPERIMENT.md) — Experiment 18, bounded local onset refinement over a coarse segmentation.
- [`ENSEMBLE_EXPERIMENT.md`](./ENSEMBLE_EXPERIMENT.md) — Experiment 19, consensus timestamps and explicit low-agreement diagnostics.
- [`VOCAL_GATED_EXPERIMENT.md`](./VOCAL_GATED_EXPERIMENT.md) — Experiment 20, voicedness-gated boundary detection for instrumental decoys.
- [`ADAPTIVE_VOCAL_EXPERIMENT.md`](./ADAPTIVE_VOCAL_EXPERIMENT.md) — Experiment 21, coverage-based routing between vocal-gated and energy-only alignment.
- [`ADAPTIVE_VOCAL_SWEEP_EXPERIMENT.md`](./ADAPTIVE_VOCAL_SWEEP_EXPERIMENT.md) — Experiment 23, sensitivity of vocal-gate routing thresholds.
- [`VOCAL_SEPARATION_EXPERIMENT.md`](./VOCAL_SEPARATION_EXPERIMENT.md) — optional full-mix versus separated-vocal comparison.
- [`REFERENCE_TEMPLATE_ALIGNMENT.md`](./REFERENCE_TEMPLATE_ALIGNMENT.md) — reference-assisted MFCC/DTW and alternate-recording evaluation.
- [`MFCC_CACHE_EXPERIMENT.md`](./MFCC_CACHE_EXPERIMENT.md) — repeatable whole-recording MFCC cache optimization.
- [`CONFIDENCE_CALIBRATION_EXPERIMENT.md`](./CONFIDENCE_CALIBRATION_EXPERIMENT.md) — confidence buckets and failure-review diagnostics.
- [`REFERENCE_TARGET_PREFLIGHT.md`](./REFERENCE_TARGET_PREFLIGHT.md) — cheap structural checks before expensive pair alignment.
- [`FULL_ENGINE_COMPARISON.md`](./FULL_ENGINE_COMPARISON.md) — Experiment 24, seeded broad comparison across all current engines.
- [`SILENCE_AWARE_EXPERIMENT.md`](./SILENCE_AWARE_EXPERIMENT.md) — Experiment 22, pause-aware boundary evidence for phrase gaps.
- [`TEXT_UNIT_EXPERIMENT.md`](./TEXT_UNIT_EXPERIMENT.md) — Experiment 25, Unicode grapheme versus codepoint duration priors.
- [`DTW_MEMORY_EXPERIMENT.md`](./DTW_MEMORY_EXPERIMENT.md) — Experiment 26, rolling-cost constrained DTW memory optimization.
- [`OFFLINE_PIPELINE_SMOKE.md`](./OFFLINE_PIPELINE_SMOKE.md) — Decoder-to-features-to-alignment end-to-end smoke path using generated WAV bytes.
- [`REAL_FILE_REQUIREMENTS.md`](./REAL_FILE_REQUIREMENTS.md) — Exact private audio, lyrics, pairing, and verification requirements.
- [`REAL_CANDIDATE_VALIDATION.md`](./REAL_CANDIDATE_VALIDATION.md) — Metadata-only validator for collected MP3/LRC candidates.
- [`REAL_CASE_EVALUATION.md`](./REAL_CASE_EVALUATION.md) — Private batch evaluator for verified case folders and all selectable engines.
- [`COMPATIBILITY.md`](./COMPATIBILITY.md) — Runtime boundary and optimization checks for reusable modules.
- [`PERFORMANCE_BENCHMARK.md`](./PERFORMANCE_BENCHMARK.md) — Runtime and heap benchmark protocol for all alignment engines.

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

To prepare a bounded set of real private candidates without copying media into
the repository, run `npm run prepare-local-evaluation`. The generated
`benchmarks/private/local-evaluation.json` is ignored by Git and keeps only
absolute local paths, metadata and empty review fields.

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

After running the experiment commands, create the reproducible Markdown audit
with `npm run summarize-experiments`. The report intentionally distinguishes
synthetic fixture results from real-song accuracy.
