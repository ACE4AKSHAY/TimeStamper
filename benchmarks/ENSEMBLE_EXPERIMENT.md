# Experiment 19 — Boundary candidate ensemble

## Question

Can independent deterministic candidates be combined into a useful line-level
consensus while exposing disagreement for human review?

## Algorithm

`src/ensemble-aligner.js` runs adaptive Boundary-DP, text-weighted
Boundary-DP, and local boundary refinement. It takes the median start time for
each line, which preserves monotonicity because every candidate is monotonic.
Median absolute deviation becomes a bounded confidence value. Lines below the
agreement threshold or above the spread limit receive a `low_agreement` or
`wide_spread` review category.

This is an uncertainty layer, not a learned confidence model. It does not prove
that a line is sung at the selected time.

## Code and runner

| File | Role |
| --- | --- |
| `src/ensemble-aligner.js` | Candidate execution, consensus, confidence and review diagnostics. |
| `src/engine.js` | Selectable `engine: "ensemble-boundary"` entry point. |
| `scripts/run-ensemble-experiment.mjs` | Synthetic comparison runner. |
| `benchmarks/example.ensemble.synthetic.json` | English, Telugu and Hindi fixture. |

Run it with:

```powershell
$env:Path = 'C:\Users\aksha\AppData\Local\nvm\v22.23.2;' + $env:Path
npm run experiment-ensemble
```

Real recordings are still required to calibrate confidence thresholds and
measure whether consensus helps or merely averages correlated mistakes.
