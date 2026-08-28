# Experiment 12 — adaptive intro-aware Boundary-DP

## Question

Can the long-intro improvement be retained without applying intro detection to
ordinary tracks? This candidate runs both estimates, then selects the
intro-aware path only when the detected intro is at least three frames.

## Scope

The original Boundary-DP and intro-aware engines are unchanged. The adaptive
selector is a third, explicit engine and records which path it selected. The
threshold is a parameter for experimentation, not a hidden default change.

## Interpretation limits

The comparison uses five deterministic robustness scenarios and 25 line
starts. A delayed onset can still resemble a short intro, while a quiet vocal
opening can be missed. These are synthetic findings and must not be treated as
real-song accuracy.

## Reproduce

```powershell
$env:Path = 'C:\Users\aksha\AppData\Local\nvm\v22.23.2;' + $env:Path
npm run experiment-robustness
npm run experiment-adaptive-boundary
```

Output is written to the ignored `benchmarks/results/adaptive-boundary-study.json`.
