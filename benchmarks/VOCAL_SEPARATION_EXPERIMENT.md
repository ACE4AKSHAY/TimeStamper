# Vocal separation comparison path

## What this step adds

The project now has a small platform-neutral separator contract in
`src/vocal-separator.js` and a local comparison runner in
`scripts/run-separation-comparison.mjs`. No separation model is bundled or
downloaded. A future Demucs, Spleeter, native, or mobile adapter can return
mono PCM through the same contract.

The comparison runs the same deterministic alignment engines twice:

1. against the original full mix;
2. against a vocal-separated file produced by a local tool.

Both runs are scored against the same manually verified `reference.json`.
This isolates whether removing accompaniment improves line timing rather than
changing the algorithm and the input at the same time.

## Important distinctions

- A separated vocal file is a preprocessing variant of one recording, not a
  second independent recording.
- An instrumental/piano/karaoke file is a useful negative-control case, but it
  cannot provide sung acoustic templates because the vocal evidence is absent.
- A cover, live performance, or alternate official mix is a true alternate
  target for reference-template generalization.
- MP3-to-WAV conversion does not create a new recording.

## Contract

`createVocalSeparator({ name, version, separate })` validates that an adapter
returns non-empty samples and a positive sample rate. `createPassthroughSeparator`
exists only for wiring tests; it does not separate vocals. The contract has no
Node, Electron, network, or machine-learning dependency.

## Comparison command

```powershell
$env:Path = 'C:\Users\aksha\AppData\Local\nvm\v22.23.2;' + $env:Path
& 'C:\Users\aksha\AppData\Local\nvm\v22.23.2\npm.cmd' run compare-vocal-separation -- `
  'C:\path\to\full-mix.mp3' `
  'C:\path\to\vocals.wav' `
  'C:\path\to\lyrics.lrc' `
  'C:\path\to\reference.json' `
  'benchmarks/private/vocal-separation-comparison.json'
```

The output contains only local paths, decoder metadata, timings, metrics and
engine settings. It remains ignored; audio and lyric text are never copied to
Git.

## Current status and next measurement

The existing real-data vocal-gated experiments use pitch/voicedness heuristics
on the full mix; they are not source separation. This comparison path is ready,
but no actual separation result exists until a local vocal stem or separator is
provided. The first useful batch is 3–5 verified vocal songs, comparing MAE,
median error, within-250/500/1000-ms rates, confidence and runtime. A model may
need a one-time setup/download, but the finished app must keep separation
optional and continue working offline without it.
