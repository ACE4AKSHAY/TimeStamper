# Experiment 11 — intro-aware boundary alignment

## Question

Can the known long-intro failure be reduced without changing the existing
Boundary-DP engine? This experiment adds a separate variant that detects the
first sustained above-threshold activity frame, slices the leading intro, and
then delegates segmentation to the preserved Boundary-DP implementation.

## Safety and scope

The original `boundary-dp` engine is unchanged. The new
`intro-aware-boundary-dp` engine is selectable through the platform-neutral
engine API and records the detected intro frame/time for inspection. It is a
deterministic heuristic, not speech recognition or machine learning.

## Evaluation

The comparison uses the five deterministic robustness scenarios (25 line
starts). The input must be regenerated with `npm run experiment-robustness` so
the ignored JSON includes the synthetic profiles needed by this runner.

The heuristic is expected to improve the long-intro case, but delayed onsets
can still be wrong because a profile peak is not the same thing as the instant
the singer begins a lyric. These results remain synthetic and do not select a
production default.

## Reproduce

```powershell
$env:Path = 'C:\Users\aksha\AppData\Local\nvm\v22.23.2;' + $env:Path
npm run experiment-robustness
npm run experiment-intro-aware
```

The generated comparison is written to the ignored
`benchmarks/results/intro-aware-study.json` file.
