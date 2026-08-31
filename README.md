# LyricSync v0.3

An offline-first, desktop-first foundation for the **Lightweight Offline Audio-Text Synchronization Engine and LRC Generator** project. This first milestone establishes the editable timeline and project workflow before algorithmic alignment is introduced.

## Offline-first by design

All required capabilities work with no network connection: importing audio and lyrics, waveform generation, playback, manual timing, project storage, logging and LRC export. No files are uploaded or sent to a server.

Online lyrics/LRC discovery is deliberately a future **optional connector**, not a dependency. It will be behind an explicit user action and setting, return text to the same local parser, and must fail harmlessly when offline. The reusable `OnlineLyricsProvider` boundary exists in `src/online-provider.js`; no provider or network request is enabled in v0.1.

## Included in v0.1

- Import common browser-supported audio files, view a decoded waveform, seek and play.
- Import TXT or LRC lyrics, or paste lyrics directly. UTF-8 and Unicode normalization preserve native scripts such as Telugu, Hindi, Tamil, Japanese and more; lyrics do not need a language selection to work. A one-line lyric document is also valid.
- Edit a line-level timeline: select a line and stamp either the current position or a typed time, use the configurable stamp shortcut (default `T`), or adjust by a user-chosen millisecond value (100 ms by default). Clicking a timestamp or lyric row seeks the audio and waveform to that point; stamping scrolls the next selected line into view, and a short toast prevents out-of-order timestamps.
- Click or drag the waveform to seek, with millisecond time feedback. Use a direct time field for exact navigation.
- General Settings provide built-in themes, waveform colour and text-size preferences, plus user-editable shortcuts for play/stop, stamping and playback nudging. Settings are stored locally and isolated from the synchronization engine.
- Transport includes hold-to-rewind and hold-to-fast-forward controls, a separate reset-to-start control, and a stop button that preserves the current position.
- The next research layer is available as **Initial timing**: a local RMS-energy baseline that distributes existing lyric lines through active audio. It is intentionally labelled as a low-confidence editable estimate—not lyric recognition—and should be reviewed line by line.
- The reusable engine also exposes a deterministic **combined-profile** experiment that fuses normalized RMS energy and spectral flux with explicit weights. It is isolated from the UI and contains no AI/ML model or network dependency.
- The reusable engine exposes an opt-in **reference-template-mfcc-dtw** mode for aligning a target recording from a manually verified reference recording. It is kept separate from the instant audio-only estimate because it is CPU-heavy and needs a second recording.
- Export valid centisecond LRC, including optional title, artist, album and language metadata.
- Save/reopen a human-readable `.lyricsync.json` project. Audio is deliberately only referenced by name; reselect it after reopening so the application does not copy large private media files.
- Human-readable activity log download.
- Unit tests for LRC parsing/export.

## Real private-library evaluation

The reusable engines are ready for a real-data evaluation pass, but a
downloaded LRC is not automatically ground truth. Generate ignored,
metadata-only stubs from the private collection with the requested NVM Node:

```powershell
$env:Path = 'C:\Users\aksha\AppData\Local\nvm\v22.23.2;' + $env:Path
& 'C:\Users\aksha\AppData\Local\nvm\v22.23.2\npm.cmd' run prepare-local-evaluation
```

The output is `benchmarks/private/local-evaluation.json`; it contains paths and
review fields, not copied media or lyric text, and is ignored by Git. Review
5–10 clear vocal pairs in the app before using them as accuracy references.
See [`benchmarks/REAL_DATA_EVALUATION.md`](benchmarks/REAL_DATA_EVALUATION.md)
for the exact checklist and the decoder boundary.

## Run as a desktop application

The project now includes an Electron desktop shell for Windows, macOS and Linux. Install the development dependency once (an internet connection is only needed for that installation), then run it locally:

```powershell
npm install
npm run desktop
```

If the global Node.js path is unavailable, use the installed NVM Node 22 runtime explicitly (the configuration currently lives at this user-local path):

```powershell
$env:Path = 'C:\Users\aksha\AppData\Local\nvm\v22.23.2;' + $env:Path
& 'C:\Users\aksha\AppData\Local\nvm\v22.23.2\npm.cmd' run desktop
```

The installed application itself loads local files only; it does not need the internet to operate. Native Save/Open dialogs are used in desktop mode.

## Run in a browser during development

Node.js 18 or newer is the only prerequisite.

```powershell
node scripts/serve.mjs
```

Open `http://localhost:4173` in a browser. The app is static and does not upload audio or lyrics.

Run the tests with:

```powershell
node --test
```

For the current human-review gate, follow [`MANUAL_REVIEW_CHECKLIST.md`](MANUAL_REVIEW_CHECKLIST.md). It includes the NVM launch command, exact UI/algorithm checks, and the small report format needed for the next algorithm decision.

## Architecture

The v0.1 browser UI is a thin client over reusable ES modules:

- `src/domain.js` — lyric/project models and text normalization
- `src/lyrics.js` — TXT/LRC input normalization
- `src/lrc.js` — LRC timestamp conversion and export
- `src/storage.js` — project serialization and file downloads
- `src/logger.js` — human-readable project logger
- `src/app.js` — UI, playback, waveform visualization and manual editor
- `desktop/` — minimal secure Electron shell; the renderer has no Node.js access
- `src/online-provider.js` — optional online-search contract, intentionally unused by core functionality
- `src/engine.js` — platform-neutral `synchronize()` entry point for reusable alignment engines
- `src/project-store.mjs` — structured local project directory storage for desktop/CLI workflows
- `src/feature-cache.mjs` — file-backed, content-identity/config-keyed cache for reusable decoded features and alignment inputs
- `src/mfcc-feature-cache.mjs` — cache-aware whole-recording MFCC extraction used by reference-template experiments
- `src/audio-feature-cache.mjs` — optional cache-aware profile/pitch extraction used by local alignment and private evaluation scripts
- `src/run-config.mjs` — stable, serializable record of the settings used for each alignment run
- `src/metrics.js` and `scripts/run-benchmark.mjs` — accuracy and resource measurement for experiments
- `src/metrics.js` — timestamp metrics plus confidence-bucket diagnostics for review prioritization
- `src/features.js` — configurable pure-JavaScript MFCC extraction
- `src/audio-profiles.js` and `src/profile-fusion.js` — explainable RMS/spectral-flux extraction and weighted profile fusion
- `src/pitch-profile.js` — bounded autocorrelation pitch and voicedness extraction
- `src/audio-decoder.mjs` — dependency-free WAV decoding with optional local FFmpeg for compressed audio
- `src/template-builder.js` — MFCC line-template extraction from a verified reference timeline
- `src/reference-template-aligner.js` — reusable reference-assisted MFCC/constrained-DTW pipeline for aligning a target recording, with intro and duration bounds
- `src/vocal-separator.js` — optional, model-agnostic local vocal-separation contract; no separator model is bundled
- `src/combined-aligner.js` — reusable combined-profile candidate generator
- `src/text-weighted-aligner.js` — Unicode-safe lyric-length prior with a selectable Boundary-DP variant
- `src/boundary-refiner.js` — bounded coarse-to-fine onset refinement with explainable confidence margins
- `src/ensemble-aligner.js` — deterministic candidate consensus and low-agreement review diagnostics
- `src/vocal-gated-aligner.js` — energy/voicedness gating for instrumental-decoy suppression
- `src/adaptive-vocal-aligner.js` — coverage-based routing between vocal-gated and energy-only alignment
- `src/silence-aware-aligner.js` — pause/onset-aware Boundary-DP candidate with configurable gap terms
- `src/evaluation.js` and `scripts/evaluate-real-cases.mjs` — private verified-case scoring contract and batch evaluator
- `src/dtw.js` and `src/mfcc-dtw.js` — constrained DTW and MFCC sequence alignment
- `src/dtw-banded.js` — isolated rolling-cost DTW implementation for long-sequence memory experiments

MFCC and constrained DTW primitives are now present. They compare two feature sequences; they do not magically infer words from lyrics. The next research task is to define and validate how each known lyric line gets an acoustic/template representation, then use that representation to produce line timestamps. This keeps the research honest and prevents a generic DTW path from being mislabeled as lyric recognition.

Run `npm run compare-engines` to compare the energy baseline and combined profile on the checked-in synthetic fixture. The output is a wiring smoke test, not evidence of real-song accuracy.

Run `npm run experiment-text-weighted` to compare equal-duration Boundary-DP
with the isolated text-weighted prior. The prior is useful for testing uneven
lyric line lengths but is not selected as the production default without
real-song evidence.

Run `npm run experiment-text-unit` to compare codepoint and Unicode grapheme
duration priors. The grapheme option is useful for combining-mark scripts but
is still an experiment, not a claim of syllable or word recognition.

For a local decoded-file run, use `npm run align-local -- <audio-path> <lyric-path> [engine] [output-json]`. WAV/PCM works without extra packages; MP3/M4A/FLAC require an available local FFmpeg executable. The command reuses derived profiles from the ignored `cache/features` directory; set `LYRICSYNC_DISABLE_FEATURE_CACHE=1` to disable it or `LYRICSYNC_FEATURE_CACHE_DIR=<folder>` to choose another cache location. See `benchmarks/REAL_DATA_EVALUATION.md` and `benchmarks/FEATURE_CACHE_INTEGRATION.md` for the privacy boundary and cache details.

For reference-assisted MFCC/DTW, use `npm run align-reference-template -- <target-audio> <reference-audio> <reference-json> <lyrics>`. The reference JSON supplies manually verified line starts; the generated target timeline remains editable and is written only to the ignored private output path.

The same assisted path is available through the platform-neutral `synchronize()` API as `engine: "reference-template-mfcc-dtw"`. Pass the decoded PCM and verified reference starts in `parameters`; large sample arrays are intentionally removed from the returned serializable `parameters` object. This keeps the algorithm reusable for a future mobile/native front end without coupling it to Electron.

For a local implementation sanity check across reviewed recordings, set
`LYRICSYNC_DTW_IMPLEMENTATION=banded` and run
`scripts/evaluate-reference-template-cases.mjs`; see
`benchmarks/REFERENCE_TEMPLATE_SELF_EVALUATION.md`. Identical reference/target
results validate the pipeline but do not measure alternate-recording accuracy.

For held-out covers, live versions, remixes, or alternate official mixes, use
`npm run evaluate-reference-template-pairs -- <pair-root>`. Each private pair
needs independently verified `reference.json` and `target-reference.json`; the
target timeline cannot be inferred from the reference recording.
The required private folder layout is documented in
[`REFERENCE_PAIR_LAYOUT.md`](benchmarks/REFERENCE_PAIR_LAYOUT.md).

To compare a locally produced vocal stem with its original full mix, use
`npm run compare-vocal-separation -- <full-mix> <vocal-file> <lyrics> <reference-json>`. See [`benchmarks/VOCAL_SEPARATION_EXPERIMENT.md`](benchmarks/VOCAL_SEPARATION_EXPERIMENT.md). This is an optional measurement path; it does not add a network or model dependency to the app.

Reference-assisted alignment can also call a separator adapter directly through
`alignWithSeparatedReferenceTarget`; this is the integration seam for a future
local Demucs/Spleeter/native implementation.

The reference-template engine also supports an opt-in
`templateBoundaryRadius` local refinement experiment; see
[`TEMPLATE_BOUNDARY_REFINEMENT_EXPERIMENT.md`](benchmarks/TEMPLATE_BOUNDARY_REFINEMENT_EXPERIMENT.md).

The related `templateBoundaryMinImprovementRatio` option rejects small local
cost improvements; its threshold sweep is documented in
[`TEMPLATE_BOUNDARY_MARGIN_GATE_EXPERIMENT.md`](benchmarks/TEMPLATE_BOUNDARY_MARGIN_GATE_EXPERIMENT.md).
An isolated `featureNormalization: "global-zscore"` option is also available
for research comparisons; its self-reference result is recorded in
[`FEATURE_NORMALIZATION_EXPERIMENT.md`](benchmarks/FEATURE_NORMALIZATION_EXPERIMENT.md).
The reusable API also exposes an opt-in `reference-template-ensemble` engine
for median consensus and disagreement review; see
[`REFERENCE_TEMPLATE_ENSEMBLE.md`](benchmarks/REFERENCE_TEMPLATE_ENSEMBLE.md).
Its optional `ensembleOptions.weightByConfidence` mode is documented in
[`REFERENCE_TEMPLATE_WEIGHTED_CONSENSUS.md`](benchmarks/REFERENCE_TEMPLATE_WEIGHTED_CONSENSUS.md).
For multimodal disagreements, `ensembleOptions.clusterToleranceSeconds`
selects the strongest nearby hypothesis; see
[`REFERENCE_TEMPLATE_CLUSTERED_CONSENSUS.md`](benchmarks/REFERENCE_TEMPLATE_CLUSTERED_CONSENSUS.md).
Long reference-template runs accept an optional `AbortSignal` through
`options.signal`; see [`ALIGNMENT_CANCELLATION.md`](benchmarks/ALIGNMENT_CANCELLATION.md).

Template and MFCC sequence alignment accept `dtwImplementation: "banded"` as
an opt-in memory-efficient implementation. The full-matrix implementation
remains the reference until longer real-recording comparisons are complete.

Reference-template evaluators reuse cached whole-recording MFCC frames. Set
`LYRICSYNC_DISABLE_FEATURE_CACHE=1` to force a cold extraction when measuring
runtime; see [`MFCC_CACHE_EXPERIMENT.md`](benchmarks/MFCC_CACHE_EXPERIMENT.md).

Reference-template evaluation also reports high/medium/low confidence error
buckets. These are review-prioritization diagnostics, not calibrated
probabilities; see [`CONFIDENCE_CALIBRATION_EXPERIMENT.md`](benchmarks/CONFIDENCE_CALIBRATION_EXPERIMENT.md).

Alternate-recording evaluation performs a language-neutral preflight for
durations, line counts, timestamp order, and large duration differences before
MFCC/DTW begins. See [`REFERENCE_TARGET_PREFLIGHT.md`](benchmarks/REFERENCE_TARGET_PREFLIGHT.md).

The platform-neutral core can be reused by a future mobile client or a native frontend on another operating system. The project can technically meet its
objective as a line-level offline synchronizer: the remaining work is measured
real-recording validation, confidence/fallback handling, and optional decoder
or vocal-separation adapters. Near-perfect results for every arbitrary
recording cannot be guaranteed because wrong lyrics, instrumental versions,
live timing, noise, overlapping vocals and long intros are genuinely
ambiguous; verified vocal recordings are the realistic high-accuracy target.

## Constraints

Audio decoding/playback depends on the browser's codec support. MP3, WAV, OGG and M4A/AAC generally work in current desktop browsers; FLAC/OPUS support varies. In the later desktop/Python implementation, FFmpeg should provide the required format normalization.
