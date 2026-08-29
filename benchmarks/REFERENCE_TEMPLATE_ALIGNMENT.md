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
- `src/engine.js` exposes the adapter as the opt-in
  `reference-template-mfcc-dtw` engine. The engine returns the same normalized
  line shape as the other engines while omitting PCM arrays from its persisted
  parameter snapshot.
- `src/template-aligner.js` accepts optional per-line duration bands, a leading
  offset for intros, and a coarse frame stride so long recordings do not need
  an unrestricted quadratic search.
- `src/template-aligner.js` also returns relative per-line cost, bounded
  confidence, boundary-stability margins, and `reviewRequired` diagnostics.
- `src/reference-template-aligner.js` forwards the opt-in `dtwImplementation:
  "banded"` setting for lower-memory constrained DTW; the full-matrix path
  remains the reference default.
- Set `useReferenceAnchors: false` (or `LYRICSYNC_REFERENCE_ANCHORS=0` in the
  local runner) to search without assuming target starts match the reference
  timeline. This is more flexible for alternate recordings but costs more
  search time and should be compared against the anchored mode.
For recordings with a broadly different total duration, set
`anchorScale: "duration-ratio"` (or
`LYRICSYNC_REFERENCE_ANCHOR_SCALE=duration-ratio`) to scale reference start
and duration expectations by target/reference length. This is an opt-in
heuristic; a long intro or outro can make a global ratio misleading.
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

## Reviewed-folder sanity run

To exercise the full adapter on real recordings without needing a second
recording yet, run the self-evaluation harness. It uses each reviewed song as
both reference and target, so it verifies decoding, MFCC extraction, bounded
search, DTW segmentation, and confidence reporting. It is an implementation
sanity check—not evidence that the method generalizes to another singer or
recording.

```powershell
$env:Path = 'C:\Users\aksha\AppData\Local\nvm\v22.23.2;' + $env:Path
& 'C:\Users\aksha\AppData\Local\nvm\v22.23.2\npm.cmd' run evaluate-reference-template -- `
  'C:\path\to\TimeStamper_Manual_Review_2026-08-29' `
  'benchmarks/private/reference-template-self-evaluation.json' 3
```

The final argument limits the number of cases; omit it to process every case.
The output remains ignored and contains no lyric text or audio bytes.

For a true alternate-recording measurement, use
`npm run evaluate-reference-template-pairs -- <pair-root>`. Each private case
must contain `reference.mp3` (or WAV), `target.mp3` (or WAV), `lyrics.lrc`,
`reference.json`, and `target-reference.json`; both JSON files must be marked
`verified: true`. The reference file teaches the acoustic templates, while the
target file is used only for scoring. A cover/live/remix is a valid target, but
its timestamps should be checked independently because its phrasing may differ.

The first full-song pilot showed that even with duration bands, unrestricted
MFCC/DTW candidate scoring remains CPU-heavy on a 216-second MP3. The harness
therefore supports a case limit for safe experiments. This is a performance
finding, not an accuracy result; coarse MFCC downsampling and tighter candidate
pruning are now implemented before running the whole collection.
The follow-up anchored pilot reduced the search region and memory pressure but
was still too slow for this pure-JavaScript implementation. A coarse segment
descriptor is now used to rank candidates; a native/WASM DTW kernel remains a
fallback if real-folder runs are still too slow.

## Search bounds

The assisted adapter derives an expected target length for each line from the
reference start intervals. By default it allows a broad 75% duration tolerance,
preserves the reference's leading intro offset, and uses a four-frame search
stride and four-frame MFCC feature stride only for very large MFCC sequences.
Reference-assisted runs also use expected start anchors with a one-second
default tolerance; this sharply limits candidate windows around the known
reference structure and can be widened for alternate recordings.
Large assisted runs additionally rank candidates by a cheap MFCC mean-vector
descriptor and run full DTW only on the best six candidates per endpoint.
The general aligner keeps stride 1 and full-resolution features unless these
options are supplied, so existing audio-only engines retain their behavior.
Bounds are performance controls, not proof that the target recording has
identical timing.

The deterministic pruning experiment (`npm run experiment-template-pruning`)
kept zero timestamp error on the two checked-in fixtures while reducing the
small-fixture runtime from 7.64 ms (exact) to 2.47 ms (top-1) and 1.13 ms
(top-2). Synthetic speedups do not guarantee the same ratio on real MP3 files;
the real-folder pilot remains the authoritative performance test.

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
