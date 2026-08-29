# Reference-assisted MFCC/DTW alignment

## Purpose

This experiment tests a reusable assisted-alignment path when a manually
verified recording is available. It is different from the ordinary
audio-only engines: the reference timestamps identify each lyric line in one
recording, and its MFCC frames become acoustic templates. Constrained DTW then
searches for the same line patterns in a target recording while preserving
line order.

This is not AI/ML and it does not infer words from text. It is an explicit
signal-processing experiment. It is strongest when the target is the same
song and a similar vocal performance; it should not be presented as a general
lyrics recognizer.

## Code path

- `src/template-builder.js` cuts one MFCC sequence per reviewed reference line.
- `src/features.js` computes deterministic MFCC frames from PCM samples.
- `src/template-aligner.js` scores candidate target segments with constrained
  DTW and chooses a monotonic dynamic-programming segmentation.
- `src/reference-template-aligner.js` connects those pieces, validates line
  counts, handles different sample rates, and returns editable lines plus
  target/reference diagnostics.
- `src/template-aligner.js` accepts optional per-line duration bands, a leading
  offset for intros, and a coarse frame stride so long recordings do not need
  an unrestricted quadratic search.
- `src/template-aligner.js` also returns relative per-line cost, bounded
  confidence, boundary-stability margins, and `reviewRequired` diagnostics.
- `scripts/run-reference-template-alignment.mjs` is the local file runner. It
  writes only paths, metadata, and generated timestamps to the ignored private
  benchmark directory.

## Why it is isolated

The normal offline engine must work from one audio file and lyrics alone. This
experiment requires a second, manually verified reference recording, so it is
kept as an explicit opt-in path rather than silently changing the production
engine. Its output remains editable and can be compared with the audio-only
baseline.

## Usage

```powershell
$env:Path = 'C:\Users\aksha\AppData\Local\nvm\v22.23.2;' + $env:Path
& 'C:\Users\aksha\AppData\Local\nvm\v22.23.2\node.exe' scripts/run-reference-template-alignment.mjs `
  'C:\path\to\target.mp3' `
  'C:\path\to\verified-reference.mp3' `
  'C:\path\to\reference.json' `
  'C:\path\to\lyrics.lrc'
```

MP3/M4A decoding uses a local FFmpeg executable; WAV/PCM decoding is built in.
No network service or dataset upload is involved.

## Search bounds

The assisted adapter derives an expected target length for each line from the
reference start intervals. By default it allows a broad 75% duration tolerance,
preserves the reference's leading intro offset, and uses a four-frame search
stride only for very large MFCC sequences. The general aligner keeps stride 1
and unrestricted durations unless these options are supplied, so existing
audio-only engines retain their behavior. Bounds are performance controls, not
proof that the target recording has identical timing.

## Limitations and next measurement

The templates contain acoustic shape, not language meaning. Different singers,
arrangements, instrumental-only recordings, and large tempo changes can lower
the match quality. The next benchmark should compare this assisted path on
same-song alternate recordings or controlled time-stretches, then report
line-level MAE and confidence against manually reviewed references.

## Confidence interpretation

Each selected segment is compared with the median selected-line DTW cost in the
same run. A line at the median receives roughly 0.5 confidence; cheaper lines
approach 1.0, while more expensive lines receive lower values. This is a
relative diagnostic, not a probability calibrated across songs. The default
`reviewRequired` flag is true below 0.5, allowing the UI to focus manual checks
on acoustically weak or boundary-ambiguous lines. Boundary stability compares
the chosen split with small neighbouring splits; a low margin means the engine
could move that line boundary with almost no acoustic cost change.
