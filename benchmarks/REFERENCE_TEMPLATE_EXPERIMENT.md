# Reference-template MFCC/DTW experiment

## Purpose

The earlier template experiment proved that the DP/DTW implementation works
when numeric templates already exist. This milestone defines how those
templates can be acquired without machine learning: a person verifies one
reference recording, supplies its line start times, and the tool extracts one
MFCC sequence for each line interval.

## Data flow

```text
verified reference audio + reference startTimes
        -> src/template-builder.js
        -> one MFCC template per line

target audio -> src/audio-decoder.mjs -> MFCC frames
        -> src/template-aligner.js / constrained DTW
        -> src/engine.js -> editable target timeline
```

`buildMfccLineTemplates()` uses each reference start and the next line start as
the segment interval; the last line ends at the reference duration. It keeps
the feature parameters explicit so the target extraction uses the same frame
size, hop, Mel bands, and coefficient count. No lyric text is converted into
audio and no model is trained.

## CLI runner

```powershell
& 'C:\Users\aksha\AppData\Local\nvm\v22.23.2\node.exe' scripts/run-reference-template-alignment.mjs `
  'C:\path\target.wav' `
  'C:\path\verified-reference.wav' `
  'C:\path\reference.json' `
  'C:\path\lyrics.lrc' `
  'benchmarks/private/reference-template-alignment.json'
```

`reference.json` may be either `{ "startTimes": [0.4, 2.1, ...] }` or an
object containing `lines` with `startTime` values. The lyric line count must
match the reference count. WAV works without dependencies; compressed formats
still require FFmpeg through the decoder adapter.

## Interpretation and limitations

This is a real, reusable template-acquisition path, not a claim of perfect
lyrics recognition. It assumes the reference and target contain the same line
order and broadly similar performance. Instrumental recordings, missing lines,
ad-libs, repeated choruses, edits, and very different arrangements can still
produce poor matches. A verified reference set is therefore needed before
reporting accuracy, and every generated timeline remains editable.
