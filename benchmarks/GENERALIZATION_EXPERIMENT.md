# Experiment 10 — seeded synthetic generalization

## Question

Do the current engines behave consistently across many generated cases, rather
than only the small hand-designed fixtures? This experiment keeps the inputs
synthetic but varies line count, duration, uneven segment lengths, intro size,
noise amplitude, and onset delay with a fixed random seed.

## Corpus

The runner creates 60 cases and records 3–8 line starts per case. Each case
contains energy, spectral-flux, and voicedness profiles with known boundaries.
The seed is fixed so another run produces the same corpus and can be compared
in Git history. Each engine is scored over all successful line starts, and
constraint failures are counted separately.

## Interpretation limits

Generated peaks are not vocals, phonemes, languages, or recordings. This test
measures generalization across controlled numerical variation only. It cannot
replace evaluation on manually verified songs, and its best engine must not be
treated as a final default without real evidence.

## Reproduce

```powershell
$env:Path = 'C:\Users\aksha\AppData\Local\nvm\v22.23.2;' + $env:Path
npm run experiment-generalization
```

The generated JSON is written to the ignored `benchmarks/results/` directory.
