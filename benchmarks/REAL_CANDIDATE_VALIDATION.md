# Real candidate validation tool

`validate-real-candidates.mjs` prepares a private metadata-only audit for a
future MP3/LRC collection. It recursively scans `audio/` and `lyrics/`, pairs
files by normalized filename stem, parses UTF-8 lyrics, checks timestamp order
and coverage, flags likely special-version names, and reports unmatched or
ambiguous pairs.

It never writes audio bytes or lyric text to the output. The generated JSON is
under `benchmarks/private/`, which is ignored by Git.

## Reproduce

```powershell
$env:Path = 'C:\Users\aksha\AppData\Local\nvm\v22.23.2;' + $env:Path
npm run validate-real-candidates -- 'C:\path\to\dataset_private'
```

The validator does not decide whether lyrics match the recording or whether a
song is truly vocal; those remain human checks before accuracy scoring.
