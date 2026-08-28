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
npm run summarize-experiments
```
