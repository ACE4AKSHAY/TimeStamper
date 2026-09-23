# Product smoke test

Run this after installing dependencies or before committing a larger change:

```powershell
$env:Path = 'C:\Users\aksha\AppData\Local\nvm\v22.23.2;' + $env:Path
& 'C:\Users\aksha\AppData\Local\nvm\v22.23.2\npm.cmd' run smoke-test
```

The command uses generated in-memory PCM only. It does not read the Music
folder, use private media, contact LRCLIB, or require a dataset. It checks:

- native-script LRC parsing;
- PCM WAV decoding;
- explainable energy/spectral feature extraction;
- monotonic line-level synchronization;
- timestamped LRC export; and
- optional online-provider normalization without network access.

The report is written to ignored `benchmarks/results/smoke-test.json`. A
non-zero exit code means at least one contract failed.
