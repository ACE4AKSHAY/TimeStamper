# Real-data evaluation milestone

This milestone connects the reusable alignment engines to the private music
collection without publishing or copying the collection. It is deliberately a
preparation step: downloaded LRC timestamps are useful starting hints, but they
are not ground truth until a person confirms that the recording contains the
lyrics and that each line starts at the right moment.

## What was added

`scripts/prepare-local-evaluation.mjs` reads the private
`private_match_inventory.csv`, selects high-confidence timestamped LRC matches
that are not marked as instrumental/special versions, verifies that the named
files exist, parses the lyric files as UTF-8, and writes metadata-only stubs to
`benchmarks/private/local-evaluation.json`. The output is ignored by Git. It
contains absolute local paths, line counts, timestamp counts, file sizes, and a
review object; it does not contain audio bytes or lyric text.

The command also reports whether `ffmpeg` and `ffprobe` are available. The
current Node project has no decoder dependency and this machine does not expose
those commands, so the Electron/Chromium player can play supported files but a
future automated acoustic run needs a local PCM decoder. This is an explicit
dependency boundary, not a hidden assumption. The new `src/audio-decoder.mjs`
module supplies that boundary: PCM WAV works with no dependency, while MP3,
M4A, FLAC and similar formats use an optional local FFmpeg executable.

## Run it with the requested NVM Node

```powershell
$env:Path = 'C:\Users\aksha\AppData\Local\nvm\v22.23.2;' + $env:Path
& 'C:\Users\aksha\AppData\Local\nvm\v22.23.2\npm.cmd' run prepare-local-evaluation
```

To use a different private copy, pass its root and an optional output/count:

```powershell
& 'C:\Users\aksha\AppData\Local\nvm\v22.23.2\node.exe' scripts/prepare-local-evaluation.mjs 'C:\path\to\dataset_private' 'benchmarks/private/local-evaluation.json' 10
```

## Exact manual gate for trustworthy measurements

The algorithm can be developed without manual review, but accuracy numbers
cannot be trusted until a small reference set exists. Review 5–10 clear vocal
recordings first:

1. Run the command above and open the local app with `npm start` (the NVM
   command from the main README).
2. For one item in `local-evaluation.json`, open its `audioPath` and matching
   `lyricPath` in the app. UTF-8 parsing preserves Telugu, Hindi, and other
   native-script text; language is not used as an alignment feature.
3. Listen for enough of the recording to confirm that it is the same song,
   contains vocals, and is not a piano/instrumental/cover/remix mismatch.
4. Click a lyric row to seek, use `T` to stamp, and correct every line that is
   early or late. The editor prevents a line from being earlier than the prior
   line, shows a toast, and advances/autoscrolls to the next line.
5. Record the three decisions (`audioMatchesLyrics`, `isVocalRecording`,
   `timestampsVerified`), correction count, and notes in a private review copy.
   Only rows with all three decisions set to `true` and a corrected timestamp
   array should be used as benchmark ground truth.

This is the only user interaction needed for evaluation. It is not required to
use the editor or to continue algorithm implementation.

## Run one local alignment job

Once a decoder is available, the same platform-neutral engines can be invoked
from the command line. The result is written to the ignored private directory:

```powershell
& 'C:\Users\aksha\AppData\Local\nvm\v22.23.2\node.exe' scripts/run-local-alignment.mjs `
  'C:\path\to\song.wav' `
  'C:\path\to\song.lrc' `
  multi-profile-boundary-dp `
  'benchmarks/private/local-alignment.json'
```

The command decodes to mono Float32 PCM, extracts RMS/spectral-flux/pitch
profiles, calls `src/engine.js`, and records the generated editable timeline.
Use `energy-baseline`, `combined-profile`, `boundary-dp`, or
`multi-profile-boundary-dp` as the engine argument. If an MP3/M4A is selected
without FFmpeg, the command stops with an actionable decoder message instead
of silently producing bad data.

## Why this objective is technically achievable

The target is a reusable **line-level** synchronizer: convert decoded audio to
explainable profiles (energy, spectral change, and bounded pitch/voicedness),
then choose monotonic line boundaries with dynamic programming and confidence
signals. That is a finite engineering problem and the repository already keeps
each candidate algorithm isolated, documented, and callable through
`src/engine.js`.

Near-perfect results for every possible recording are not a realistic promise.
Instrumentals, wrong lyrics, live performances, long intros, overlapping
vocals, severe noise, and timing conventions make the input ambiguous. The
achievable product goal is very high accuracy on verified vocal recordings,
automatic fallback/low-confidence marking for difficult cases, and a fast
manual correction path. Commercial “automatic lyrics” products do not remove
this ambiguity; they use large proprietary datasets and still encounter
recording-specific failures. This project remains valuable because it is
offline, explainable, reusable, and can improve on the user’s own verified
collection without a machine-learning model.

## Manual-review benchmark result (2026-08-29)

The user manually listened to every audio/LRC pair in the private review
folder and confirmed that the displayed line timings were good. Those reviewed
timestamps were written beside each case as `reference.json`; these files hold
numeric timestamps and review status only. The source media and lyric text stay
outside the repository. The duplicate `lyrics.lrc` in the Baitikochi Chuste
case was removed; the original song-named `Baitikochi Chuste.lrc` was retained.

The batch evaluator decoded all 17 MP3 files locally and compared six
audio-only engines against the reviewed timestamps (951 lyric lines total):

| Engine | Mean absolute error | Median absolute error | Lines within 1 s |
| --- | ---: | ---: | ---: |
| Text-weighted Boundary-DP | 7.99 s | 5.54 s | 9.5% |
| Ensemble Boundary | 8.99 s | 6.74 s | 6.4% |
| Adaptive Boundary-DP | 9.00 s | 6.74 s | 6.1% |
| Refined Boundary-DP | 9.07 s | 6.85 s | 6.2% |
| Vocal-gated Boundary-DP | 9.26 s | 7.10 s | 6.6% |
| Adaptive-vocal Boundary-DP | 9.26 s | 7.10 s | 6.6% |

This is the first real-recording result, not a synthetic smoke test. It shows
that the current energy/boundary features are useful for producing an editable
starting timeline, but are not yet a reliable automatic lyric synchronizer.
The large error is expected from an audio-only model that does not know which
spoken/sung words correspond to each lyric line. The next algorithm work should
focus on reference-assisted acoustic templates, stronger vocal/phoneme evidence,
and confidence-based fallback while retaining the manual editor.

The metadata-only report is written to the ignored path
`benchmarks/private/real-case-evaluation.json` by:

```powershell
$env:Path = 'C:\Users\aksha\AppData\Local\nvm\v22.23.2;' + $env:Path
& 'C:\Users\aksha\AppData\Local\nvm\v22.23.2\npm.cmd' run evaluate-real -- 'C:\path\to\TimeStamper_Manual_Review_2026-08-29'
```

Why both kinds of testing matter: the user’s listening review establishes the
semantic ground truth for each recording; automated evaluation checks that the
parser, decoder, feature extraction, and engine reproduce measurable results
across all cases. It does not override the user’s musical judgment.

## Next engineering step

The decoder/profile adapter is now exercised against real MP3 files. The next
research step is to build and measure reference-assisted acoustic line
templates (MFCC/constrained-DTW) and stronger vocal evidence, then compare them
against the baseline above. Keep the decoder optional so browser playback and
future mobile ports remain modular. No songs, lyrics, or private manifests
should ever be committed.
