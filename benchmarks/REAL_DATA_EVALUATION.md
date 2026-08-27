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
dependency boundary, not a hidden assumption.

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

## Next engineering step

Install or expose a local decoder (FFmpeg is the simplest option), then add a
small PCM adapter that feeds real audio into the existing profile and engine
APIs. Keep the decoder optional so browser playback and mobile ports remain
modular. No songs, lyrics, or private manifests should ever be committed.
