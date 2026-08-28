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

## Interpretation

These are synthetic fixtures, not sung recordings. They validate feature
extraction, engine wiring, metrics, and reproducibility. The zero-error
template-DTW and boundary-DP rows are expected because those fixtures contain
clean, known boundaries; they must not be read as a claim of perfect
real-world synchronization.

The ablation fixture currently favours boundary dynamic programming over the
energy and combined-profile baselines. This is a hypothesis for the next
real-data experiment, not a final algorithm choice.

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
npm run summarize-experiments
```
