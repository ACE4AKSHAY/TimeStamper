# Performance benchmark

This benchmark measures runtime and observed heap usage for every current
alignment engine on the same deterministic fixture. It is separate from
accuracy experiments: a faster engine is not automatically a better engine.

Each sample warms the engine first, then runs both fixture cases. The report
records median, p95, minimum and maximum elapsed time plus the largest observed
Node heap value. Results vary by machine and are not committed as raw JSON.

## Reproduce

```powershell
$env:Path = 'C:\Users\aksha\AppData\Local\nvm\v22.23.2;' + $env:Path
npm run benchmark-performance
```

Pass a third argument to choose the iteration count, for example:
`node scripts/run-performance-benchmark.mjs benchmarks/example.multi-profile.synthetic.json benchmarks/results/performance-benchmark.json 1000`.

The generated JSON is written to the ignored `benchmarks/results/` directory.
Do not compare runtimes across machines without recording Node and operating
system details.
