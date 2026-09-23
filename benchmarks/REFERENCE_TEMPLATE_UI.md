# Reference-assisted alignment in the desktop app

## What this workflow does

The expandable **Reference-assisted alignment** panel aligns the currently
selected target audio to line timings learned from a separately verified
reference recording. It uses the reusable MFCC line-template and constrained
DTW engine; it does not identify words, translate lyrics, or use a language
model.

## Inputs and safety

- Target audio is the normal audio file in Project setup.
- Target lyric lines are the normal current timeline. They must have the same
  number of lines as the reference LRC.
- Reference audio is a second recording of the same song (official alternate,
  cover, live, remix, or another mix).
- Reference LRC must have one ordered timestamp on every line and should be
  manually verified. The app rejects missing, backward, or mismatched lines.
- Audio samples are decoded locally, transferred to a disposable module worker,
  and never uploaded. The worker is terminated after completion or cancellation.

## Runtime behavior

1. Choose target audio and load target lyrics.
2. Expand the reference-assisted panel.
3. Choose the verified reference audio and reference LRC.
4. Start alignment. Progress reports the current MFCC/DTW line; Cancel sends a
   cooperative abort signal and terminates the worker.
5. The returned line times replace the editable target timeline. Review them
   against the target recording before exporting LRC.

The original manual stamping and energy-based **Initial timing** workflows are
unchanged. If a second recording is unavailable, use those local workflows or
an imported LRC instead.
