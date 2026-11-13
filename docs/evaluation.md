# Evaluation workflow

`npm run evaluate` runs a deterministic synthetic regression corpus and writes:

- `benchmarks/results/evaluation.json`
- `benchmarks/results/evaluation.md`

The synthetic corpus checks that registered engines produce finite line starts,
that `auto-form` is included, and that metrics/diagnostics are serializable. It
does not represent real-song accuracy and must not be used as an accuracy claim.

For real evaluation, use one directory per verified case:

```text
benchmarks/private/verified-cases/
  case-name/
    audio.wav
    lyrics.lrc
    reference.json
```

`reference.json` must contain `verified: true` (or an equivalent explicit
verification field) and a monotonic `startTimes` array with one entry per lyric
line. The audio and lyric files remain local; only metadata and metrics should
be written to generated output. No public dataset or model is selected by this
repository. Choose one only after checking its license and agreeing on the
measurement protocol.
