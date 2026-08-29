# Experiment results summary

This checked-in report records the latest deterministic experiment run. The
JSON outputs under `benchmarks/results/` are intentionally ignored because
they are generated artifacts; regenerate this report with
`npm run summarize-experiments`.

## Current measurements

| Experiment | Fixture | Cases | Result |
| --- | --- | ---: | --- |
| Energy baseline | `synthetic-v1` | 2 | 4.819 s MAE; 3.333 s median; 0% within 1.00 s |
| Energy vs combined profile | `synthetic-v1` | 2 | energy 4.819 s MAE; combined 4.819 s MAE |
| Template MFCC + constrained DTW | `template-synthetic-v1` | 2 | 0.000 s MAE; 0.000 s median; 100% within 1.00 s |
| Boundary dynamic programming | `boundary-dp-synthetic-v1` | 2 | 0.000 s MAE; 0.000 s median; 100% within 1.00 s |
| Autocorrelation pitch | `pitch-synthetic-v1` | — | 0.000 Hz voiced MAE; 100% silence specificity |
| Multi-profile boundary DP | `multi-profile-synthetic-v1` | 2 | 0.400 s MAE; 0.000 s median; 100% within 1.00 s |
| Common ablation | `multi-profile-synthetic-v1` | 2 | energy 0.984 s; combined 1.638 s; boundary 0.400 s; multi-profile 0.400 s MAE |
| Robustness perturbation sweep | `robustness-synthetic-v1` | 5 | energyBaseline: 0.635 s; combinedProfile: 0.286 s; boundaryDp: 0.360 s; multi-profile 0.360 s MAE |
| Parameter sensitivity sweep | `parameter-sweep-synthetic-v1` | 2 | boundary-DP: 0.000 s; combined profile: 1.638 s; multi-profile boundary-DP: 0.400 s best MAE |
| Seeded generalization corpus | `generalization-synthetic-v1` | 60 | energyBaseline: 1.233 s; combinedProfile: 0.935 s; boundaryDp: 1.669 s; multi-profile 1.697 s MAE |
| Intro-aware Boundary-DP | `intro-aware-synthetic-v1` | 5 | existing boundary-DP: 0.360 s; intro-aware variant: 0.200 s MAE; 100% within 1.00 s |
| Adaptive Boundary-DP | `adaptive-boundary-synthetic-v1` | 5 | existing: 0.360 s; intro-aware: 0.200 s; adaptive selector: 0.180 s MAE; 100% within 1.00 s |
| Consensus confidence | `consensus-synthetic-v1` | 60 | Median of four engines: 1.324 s MAE; 60% within 1.00 s; agreement buckets high 186 / medium 49 / low 85 |
| Template-DTW tempo robustness | `template-tempo-synthetic-v1` | 6 | 0.020 s MAE for DTW windows 0, 1, and 2; 100% within 0.25 s |
| Template-DTW noise robustness | `template-noise-synthetic-v1` | 16 | 0.013 s MAE for DTW windows 1–3; 100% within 0.25 s |
| MFCC parameter sensitivity | `mfcc-parameter-synthetic-v1` | 18 | Best 0.008 s MAE; worst 0.128 s MAE across frame/hop/mel settings |
| Text-weighted Boundary-DP | `text-weighted-boundary-synthetic-v1` | 2 | equal-duration 1.583 s MAE; text-weighted 0.317 s MAE; 100% within 1.00 s |
| Boundary refinement | `boundary-refinement-synthetic-v1` | 2 | adaptive coarse 0.833 s MAE; refined 0.417 s MAE; 83% within 0.50 s |
| Boundary ensemble | `ensemble-boundary-synthetic-v1` | 2 | adaptive 0.804 s MAE; refined 0.504 s MAE; consensus 0.587 s MAE; 83% within 1.00 s |
| Vocal-gated Boundary-DP | `vocal-gated-boundary-synthetic-v1` | 2 | energy-only 0.583 s MAE; vocal-gated 0.417 s MAE; 83% within 0.50 s |
| Adaptive vocal selector | `adaptive-vocal-boundary-synthetic-v1` | 2 | energy-only 0.583 s MAE; routed 0.417 s MAE; high coverage gates, low coverage falls back |
| Silence-aware Boundary-DP | `silence-aware-boundary-synthetic-v1` | 2 | ordinary 0.417 s MAE; pause-aware 0.583 s MAE; 67% within 1.00 s |
| Adaptive vocal threshold sweep | `adaptive-vocal-threshold-sweep-v1` | 12 | all tested combinations tied at 0.417 s MAE; no synthetic winner identified |
| Full engine comparison | `full-engine-generalization-v1` | 60 | best vocal-gated 0.745 s MAE; combined profile 0.792 s; 313 total line starts |
| Offline pipeline smoke | `offline-pipeline-synthetic-v1` | 1 | 32,000 samples decoded; 64-frame profiles; multi-profile alignment 0.024 s MAE |
| Unicode text-unit prior | `text-weighted-synthetic-v1` | 2 | codepoint 0.317 s MAE; grapheme 0.450 s MAE; no default promoted |
| Rolling-cost DTW | `dtw-memory-optimization-synthetic-v1` | 3 | exact path/cost equivalence at 64/128/256 frames; approximately 2–5x faster in fixture |
| MFCC cache warm run | reviewed local self-reference subset | 2 recordings / 64 lines | 25.00 s cold; 18.89 s warm; 6.10 s (24%) saved with identical 19.5 ms MAE |

## Interpretation

These are synthetic fixtures, not sung recordings. They validate feature
extraction, engine wiring, metrics, and reproducibility. The zero-error
template-DTW and boundary-DP rows are expected because those fixtures contain
clean, known boundaries; they must not be read as a claim of perfect
real-world synchronization.

The ablation fixture currently favours boundary dynamic programming over the
energy and combined-profile baselines. This is a hypothesis for the next
real-data experiment, not a final algorithm choice.

The robustness sweep adds five synthetic scenarios. Boundary-DP is exact on
clean, noisy, and uneven-duration cases, but it cannot infer a non-zero first
line start for a long intro (5.000 s error). Delayed onsets shift later lines
by about 1 second. The combined profile is more tolerant of the long-intro
fixture, with 0.266 s MAE in that scenario. These are actionable hypotheses
for real-song evaluation, not production guarantees.

The parameter sweep found that many boundary-DP settings tie at 0.000 s on
the uniform synthetic fixture, while all tested combined-profile weight pairs
tie at 1.638 s. This means the fixture cannot identify trustworthy defaults;
no synthetic winner is promoted automatically.

The 60-case seeded corpus contains 320 line starts and produces a more sober
picture: combined profile is best at 0.935 s MAE, but only 65% of starts are
within one second; Boundary-DP reaches 1.669 s MAE. This spread confirms that
hand-designed fixture scores were optimistic and that real recordings remain
the decisive test.

The intro-aware candidate improves the five-case robustness subset from 0.360
to 0.200 s MAE and removes the 5-second long-intro failure (down to 0.5 s).
However, its active-start detector shifts a delayed-onset case by 0.5 s. It
remains an experimental selectable engine; no default has been changed.

The adaptive selector improves this five-case subset to 0.180 s MAE by using
intro-aware handling only for the detected long intro and retaining the
original engine elsewhere. This is a targeted synthetic result, not proof that
the three-frame rule is correct for real songs.

The consensus median is worse than the combined-profile result on the seeded
corpus (1.324 s versus 0.935 s MAE). Its value is diagnostic: 85 of 320 lines
were low-agreement and can be prioritized for future review. Consensus is not
promoted as the default aligner.

The template-DTW tempo sweep stayed at 0.020 s MAE across 0.75x, 1.00x, and
1.25x synthetic time scales for all tested DTW windows. This supports keeping
DTW as a candidate for tempo variation, but does not test different singers or
real acoustic recordings.

The MFCC parameter sweep ranges from 0.008 s to 0.128 s self-alignment MAE
across 18 settings. This is a useful stability range for implementation
calibration, but it does not establish which configuration is best for real
music.

The offline pipeline smoke passed generated WAV bytes through the same decoder,
feature extraction, pitch profiling, and reusable alignment stages used by
the local workflow. It produced 0.024 s MAE on four synthetic tone boundaries;
this validates integration, not real-song quality.

The template-DTW noise sweep remained within 0.125 seconds even with the
tested deterministic feature noise and 10% frame drops. Windows 1–3 tied at
0.013 s MAE, while window 0 was slightly worse at 0.019 s. This is a useful
implementation signal but not evidence of robustness to real recording noise.

Experiment 17 shows that a Unicode-safe lyric-length prior can improve the
equal-duration Boundary-DP baseline on fixtures with intentionally uneven
line lengths (1.583 s to 0.317 s MAE). This is a targeted synthetic result:
held notes, rapid syllables, repeated phrases, and instrumental gaps may break
the correlation between written length and sung duration. The engine remains
selectable and is not the default.

Experiment 18 applies a bounded local onset search after coarse segmentation.
On its two-case fixture it improves MAE from 0.833 s to 0.417 s and raises the
within-0.50-second rate to 83%. One delayed/misleading case remains 2.5 seconds
off, showing that refinement can correct nearby errors but cannot recover
missing acoustic evidence.

Experiment 19 runs adaptive, text-weighted, and locally refined candidates and
reports their median with an agreement diagnostic. On the fixture, consensus
reaches 0.587 s MAE and 83% within one second, but refinement alone is better
(0.504 s). This supports using the ensemble primarily to identify uncertain
lines for review, not to assume that averaging correlated errors is optimal.

Experiment 20 gates energy with explainable voicedness to reduce instrumental
decoys. On its two-case fixture, vocal gating improves MAE from 0.583 s to
0.417 s and reaches 83% within 0.50 s. The remaining 2.5-second miss shows
that pitch-like instrumentation or absent vocals still require review.

Experiment 21 routes by voicedness coverage: the high-coverage fixture selects
vocal gating, while the low-coverage fixture falls back to energy-only
alignment. The routed result is 0.417 s MAE versus 0.583 s for energy-only on
this fixture. The 20% coverage threshold is provisional and must be calibrated
on verified recordings.

Experiment 22 is negative evidence for the current pause heuristic: adding
quiet-gap and following-activity terms worsens this fixture from 0.417 s to
0.583 s MAE. The candidate remains preserved because real songs may behave
differently, but it is not promoted and its weights require real calibration.

Experiment 23 swept 12 vocal-routing threshold combinations. Every candidate
tied at 0.417 s MAE because the fixture contains clearly high and clearly low
voicedness coverage. This cannot identify a production threshold; borderline
real recordings are required for that calibration.

Experiment 24 compares all current engines on a fresh varied corpus. Vocal
gating ranks first (0.745 s MAE), combined profile second (0.792 s), while
text-weighted, refined, silence-aware, and basic Boundary-DP trail on this
corpus. This ranking is a development hypothesis only; real verified
recordings remain decisive.

## Real-song status

No real-song accuracy result exists yet. The private collection has not been
used as ground truth because compressed-file decoding still needs local FFmpeg
(or WAV input), and a downloaded LRC is a suggestion rather than a manually
verified reference. A trustworthy real result requires checking that the
recording contains vocals, confirming the lyric match, and verifying line
starts in the app before scoring predictions.

The application itself does not need a dataset for normal offline editing.
A small, private, manually verified reference set is needed for scientific
evaluation and regression testing. Private audio, lyrics, and generated result
JSON remain outside Git.

## Reproduce

Use the requested NVM Node 22 runtime:

```powershell
$env:Path = 'C:\Users\aksha\AppData\Local\nvm\v22.23.2;' + $env:Path
npm run compare-engines
npm run experiment-template-dtw
npm run experiment-boundary-dp
npm run experiment-pitch
npm run experiment-multi-profile
npm run ablation-study
npm run experiment-robustness
npm run experiment-parameter-sweep
npm run experiment-generalization
npm run experiment-intro-aware
npm run experiment-adaptive-boundary
npm run experiment-consensus
npm run experiment-template-tempo
npm run experiment-template-noise
npm run experiment-mfcc-parameters
npm run smoke-offline-pipeline
npm run experiment-text-weighted
npm run summarize-experiments
```
