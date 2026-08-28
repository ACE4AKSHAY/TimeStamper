# Experiment 13 — consensus and uncertainty signal

## Question

Can independent engine predictions be combined into a stable timestamp, and
does their disagreement provide a useful uncertainty signal? The candidate
uses the median start time and reports median absolute deviation, spread, and a
bounded confidence score.

## Scope

This layer does not replace any engine, inspect audio, or learn from data. It is
an explainable aggregation and review-prioritization primitive. High agreement
can still be jointly wrong, so confidence is not accuracy.

The experiment combines four predictions on the 60-case seeded synthetic corpus
(320 line starts) and reports aggregate timestamp metrics plus high/medium/low
agreement buckets.

## Reproduce

```powershell
$env:Path = 'C:\Users\aksha\AppData\Local\nvm\v22.23.2;' + $env:Path
npm run experiment-generalization
npm run experiment-consensus
```

The generated JSON is written to the ignored `benchmarks/results/` directory.
