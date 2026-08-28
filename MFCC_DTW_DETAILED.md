# LyricSync — complete project guide

This is the project-wide beginner guide for **Lightweight Offline Audio-Text Synchronization Engine and LRC Generator**. The filename is retained so existing links continue to work; the document now covers the entire repository from the first commit through the current commit, not only MFCC/DTW.

## 1. Project identity

| Item | Decision |
| --- | --- |
| User outcome | Take an audio recording plus lyrics the user already has and produce editable, timestamped LRC lines. |
| Core technical question | Can local audio analysis and temporal alignment produce practically useful line timing with modest resources? |
| Product shape | Desktop-first, offline-first application with a reusable platform-neutral engine. |
| Online behavior | Optional future lyric/LRC lookup only; no internet is required for importing, editing, synchronizing, saving, or exporting. |
| Language behavior | Lyrics are treated as UTF-8/Unicode text. Telugu, Hindi, Tamil, Japanese, English and other scripts are not filtered or converted to English. Language selection is metadata, not a prerequisite for alignment. |
| Current maturity | Version 0.2 development foundation: manual editor, RMS baseline, benchmark tooling, engine/storage modules, MFCC/DTW primitives, and template-assisted alignment. |

## 2. Status legend

| Symbol | Meaning |
| --- | --- |
| ✅ | Implemented and covered by a test or direct runtime check |
| 🟡 | Implemented partially; integration, real-data validation, or hardening remains |
| ⏳ | Planned next |
| 🔭 | Future scope, deliberately deferred |
| ⚖️ | Research/legal/product decision rather than code that should be guessed |

## 3. Version history: what changed in each commit

The repository uses small, descriptive commits so a beginner can inspect one milestone at a time. `origin/main` is synchronized with the current local `main` branch.

| Commit | Message | Main additions | Why it was built |
| --- | --- | --- | --- |
| `3d4cc99` | `feat: add offline desktop lyric synchronization foundation` | Electron shell, local browser UI, lyric parser, LRC exporter, project model, logging, settings, storage download, waveform/playback/manual editor, Unicode tests | Establishes the smallest useful product: audio + known lyrics → editable timeline → LRC. It proves the workflow before expensive algorithms. |
| `9d8ed43` | `feat: add energy baseline benchmark and research guidance` | RMS-energy initial timing, metrics, benchmark runner, synthetic fixture, dataset guidance, v0.2 versioning | Creates the first measurable automatic hypothesis without claiming that energy recognizes words. |
| `71356ea` | `feat: add reusable engine API and project store` | Platform-neutral `synchronize()` API and Node `ProjectStore` directory layout | Separates algorithm code from the desktop UI and makes future CLI/mobile frontends possible. |
| `8ab4630` | `feat: add private music library audit manifest` | Local library audit, filename pairing, timestamp-status classification, instrumental hints | Handles real collections safely. It inventories files without copying media and flags uncertain data instead of calling it ground truth. |
| `699ca56` | `feat: add MFCC extraction and constrained DTW` | Local FFT/MFCC extractor, constrained DTW, MFCC-DTW adapter | Adds the next research representations while keeping parameters configurable and testable. |
| `fee1966` | `feat: add template-assisted line alignment` | Global line-template segmentation, engine support, detailed guide | Connects acoustic comparison to line timestamps through an explicit template input rather than hiding the hard text-to-audio problem. |

## 4. Repository map

| Path | Responsibility | Used by |
| --- | --- | --- |
| `index.html` | Desktop renderer layout: project fields, import controls, waveform, transport, timeline, settings dialog and log | `src/app.js`, Electron shell |
| `styles.css` | Theme-aware, responsive and keyboard-focusable UI styling | `index.html` |
| `desktop/main.cjs` | Secure Electron main process; creates window and native text Open/Save IPC handlers | Electron runtime |
| `desktop/preload.cjs` | Exposes only safe `saveText`/`openText` functions to the renderer | `src/storage.js` |
| `scripts/serve.mjs` | Dependency-free local development web server | `npm run start` |
| `scripts/run-benchmark.mjs` | Runs a JSON dataset through the engine and writes local JSON/Markdown measurements | `src/engine.js`, `src/metrics.js` |
| `scripts/audit-library.mjs` | Scans a chosen local music folder and writes an ignored manifest | `src/dataset.js` |
| `src/domain.js` | `LyricLine`, project model, Unicode normalization, application version | Parser, UI, engine, storage |
| `src/lyrics.js` | TXT/LRC parser and normalized lyric input | UI and tests |
| `src/lrc.js` | Timestamp conversion and LRC export | UI and tests |
| `src/logger.js` | Human-readable INFO/WARNING/ERROR project logger | UI |
| `src/storage.js` | Browser downloads and Electron-aware native save/open abstraction | UI |
| `src/settings.js` | Locally persisted theme, waveform colour and text-size preferences | UI |
| `src/online-provider.js` | Optional future online-search contract; no provider is enabled | Future connector only |
| `src/energy-aligner.js` | Lightweight energy-profile line-time estimator | UI initial timing, engine |
| `src/metrics.js` | MAE, median absolute error, RMSE and threshold percentages | Benchmark runner |
| `src/engine.js` | Platform-neutral synchronization API; dispatches energy or template engine | UI/CLI/mobile future |
| `src/project-store.mjs` | Structured file-backed project save/load for desktop/CLI | Future desktop pipeline |
| `src/dataset.js` | Filename normalization, lyric timestamp classification and review flags | Library audit |
| `src/features.js` | PCM → MFCC frame vectors using FFT, Mel filters and DCT | MFCC experiments |
| `src/dtw.js` | Window-constrained DTW path and cost | MFCC and template aligners |
| `src/mfcc-dtw.js` | DTW adapter for MFCC result objects | Experiments |
| `src/template-aligner.js` | Dynamic-programming line segmentation using one acoustic template per line | Template engine |
| `test/lrc.test.mjs` | All current unit/integration-style algorithm and storage tests | `npm run test` |
| `benchmarks/example.synthetic.json` | Small deterministic, non-copyrighted smoke fixture | Benchmark runner |
| `benchmarks/README.md` | Real dataset schema, ground-truth and privacy rules | Researchers/users |
| `PROJECT_STATUS.md` | Traceability matrix for all 120 original brief sections | Project planning |
| `package.json` / `package-lock.json` | Scripts, version, Electron dependency and reproducible install versions | NVM/npm |
| `.gitignore` | Keeps node modules, private manifests, caches, results and media out of Git | Git |

## 5. Feature-by-feature explanation

### 5.1 Offline desktop foundation

**Why:** The application must work without internet, cloud APIs, or mandatory GPU access. A desktop shell gives local file access and a path to Windows/macOS/Linux packaging.

**How:** Electron loads the local `index.html`. The renderer has `contextIsolation` and no Node integration. Native file operations are narrow IPC methods in `desktop/main.cjs`, exposed through `desktop/preload.cjs`. In a browser, the same UI falls back to normal file inputs/downloads.

**Files:** `desktop/main.cjs`, `desktop/preload.cjs`, `index.html`, `styles.css`, `package.json`, `package-lock.json`.

**Current limit:** Packaging installers and FFmpeg-backed format normalization are not done. Browser/Electron codec support determines which audio files decode today.

**Future:** Add signed platform packages, FFmpeg adapter, background workers, crash-safe cancellation, and a separate mobile frontend that reuses the engine instead of Electron.

### 5.2 Lyric input and Unicode handling

**Why:** The user supplies correct lyrics, often in TXT or partially/fully timestamped LRC. The system must not depend on English or on a language label.

**How:** `src/lyrics.js` strips optional BOM, recognizes LRC metadata/timestamps, normalizes whitespace and NFC Unicode, and creates `LyricLine` objects. Untimestamped lines receive `null` start times. A single lyric line is valid. Native scripts are retained as-is.

**Files:** `src/lyrics.js`, `src/domain.js`, `test/lrc.test.mjs`.

**Current limit:** It does not automatically translate, transliterate, identify language, or judge whether downloaded lyrics match the audio.

**Future:** Optional language metadata detection, line-ending/duplicate cleanup, SRT/VTT/ASS input, and explicit user review for mismatches.

### 5.3 Timeline and LRC export

**Why:** LRC is the first practical output and only needs a start timestamp per line.

**How:** The UI edits `LyricLine.startTime`. `src/lrc.js` converts seconds to centiseconds with rounding, sorts timestamped lines by time, writes optional artist/title/album/language headers, and omits lines that have no timestamp rather than exporting invalid values.

**Files:** `src/lrc.js`, `src/domain.js`, `src/app.js`, `test/lrc.test.mjs`.

**Current limit:** Export is line-level. End times, word timing, karaoke effects and other subtitle formats are not implemented.

**Future:** Enhanced/word-level LRC, SRT/VTT/ASS exporters, validation warnings for missing lines, and export profiles.

### 5.4 Waveform, playback and manual review

**Why:** Automatic alignment will sometimes fail. A person needs to see the signal, listen, make fast corrections, and understand the current position.

**How:** `src/app.js` creates an object URL for the selected local audio, decodes a downsampled waveform through `AudioContext`, draws it on a canvas, and maps pointer position to `audio.currentTime`. The slider and waveform show `mm:ss.mmm`. Play/stop, reset, hold-to-rewind, hold-to-fast-forward, exact seek, editable stamp time, custom millisecond adjustment, keyboard shortcuts and row insert/duplicate actions are all local UI behavior.

**Files:** `index.html`, `styles.css`, `src/app.js`, `src/settings.js`.

**Current limit:** Waveform decoding happens in the renderer and is not yet a worker; very large files may use more memory. There is no undo/redo history yet.

**Future:** Worker-based decoding, zoom/regions, snap-to-candidate, undo/redo, accessibility announcements for selected lines, and low-confidence highlighting.

### 5.5 Local project storage and logging

**Why:** Projects must reopen without hiding everything in one opaque file, and users/developers must understand what happened.

**How:** Browser mode downloads a `.lyricsync.json`; Electron mode uses native Save/Open dialogs. `src/project-store.mjs` additionally creates `project.json`, `lyrics/normalized.json`, `timeline/timeline.json`, and reserved folders for features, separation, alignment, exports, logs and experiments. `ProjectLogger` records timestamped human-readable entries.

**Files:** `src/storage.js`, `src/project-store.mjs`, `src/logger.js`, `desktop/main.cjs`.

**Current limit:** The renderer project save is a user-selected file, not yet an automatic managed project directory. Audio is referenced by name and must be reselected after reopening.

**Future:** Managed project roots, cache fingerprints, atomic saves, migration versions, DEBUG logs, and crash recovery.

### 5.6 RMS/energy baseline

**Why:** A simple baseline is needed before advanced algorithms. It tests whether active audio regions can provide useful initial timing at low cost.

**How:** The waveform decoder calculates per-bin RMS energy. `src/energy-aligner.js` subtracts a low percentile threshold, treats remaining energy as weights, and places known lyric lines at weighted cumulative positions. It marks outputs `energy_baseline` with deliberately low confidence.

**Files:** `src/energy-aligner.js`, `src/app.js`, `src/engine.js`, `scripts/run-benchmark.mjs`.

**Current limit:** Energy does not identify words or know whether a vocal is singing. It can only suggest broad active positions and must be reviewed.

**Future:** Silence/phrase segmentation, vocal-activity features, calibrated confidence and real verified-pair accuracy measurement.

### 5.7 Benchmarking and metrics

**Why:** The project must produce evidence rather than assume AI, DTW, separation or energy is best.

**How:** `scripts/run-benchmark.mjs` reads a JSON dataset containing duration, energy profile, lyrics and manually supplied reference times. It invokes the engine, computes MAE, median absolute error, RMSE and percentages within 0.25/0.50/1.00 seconds, records runtime/heap, and writes JSON plus Markdown locally.

**Files:** `src/metrics.js`, `scripts/run-benchmark.mjs`, `benchmarks/example.synthetic.json`, `benchmarks/README.md`.

**Current limit:** The checked-in fixture is synthetic and cannot establish song-level accuracy. CPU/GPU/disk metrics and CSV output remain incomplete.

**Future:** Rights-cleared real fixtures, stage timing, RTF, CPU/RAM/GPU/disk measurements, failure categories, CSV reports and regression thresholds.

### 5.8 Platform-neutral engine API

**Why:** The algorithm should be reusable independently of Electron and eventually usable by a CLI, library, mobile client or another operating system.

**How:** `src/engine.js` accepts normalized lyrics, duration, energy profile or template parameters and returns structured lines plus method/version metadata. The UI is a caller, not the owner of alignment logic.

**Files:** `src/engine.js`, `src/domain.js`, `src/energy-aligner.js`, `src/template-aligner.js`.

**Current limit:** Only energy baseline and template-MFCC-DTW modes exist. The template mode requires acoustic templates and is not yet wired to a one-click UI workflow.

**Future:** Formal TypeScript/Python package boundary, engine registry, configuration schema, CLI and mobile bindings.

### 5.9 Private music-library audit and dataset preparation

**Why:** A personal folder can contain vocal songs, piano/instrumental versions, downloaded lyrics, missing timestamps, duplicates and mismatched recordings. Treating every file as truth would invalidate experiments.

**How:** `scripts/audit-library.mjs` recursively reads only local filenames and UTF-8 lyric text. `src/dataset.js` normalizes filename stems, detects timestamp coverage (`fully_timestamped`, `partially_timestamped`, `untimestamped`, `invalid`), finds exact audio-name candidates, and flags likely instrumental hints. It writes a relative-path manifest under ignored `benchmarks/private/`.

**Files:** `src/dataset.js`, `scripts/audit-library.mjs`, `benchmarks/README.md`, `.gitignore`.

**Current audit:** 1,027 audio files, 133 lyric files, 66 fully timestamped, 1 partial, 65 untimestamped, 17 likely instrumental, 118 exact candidates, and 77 needing review.

**Current limit:** Filename hints cannot prove audio content or lyric correctness. Downloaded LRC timestamps are not automatically ground truth.

**Future:** User review UI, metadata editing, audio duration/codec inspection, duplicate detection, rights/licensing fields, and export of approved benchmark subsets.

### 5.10 MFCC feature extraction

**Why:** MFCC is a compact representation of short-time spectral shape and is useful for testing local acoustic similarity.

**How:** `src/features.js` applies a Hamming window, radix-2 FFT, Mel-spaced triangular filter banks, log energy and DCT. Frame size, hop size, Mel-band count and coefficient count are configurable. It returns feature vectors plus frame-rate metadata.

**Files:** `src/features.js`, `test/lrc.test.mjs`.

**Current limit:** This is a dependency-free research implementation, not yet optimized like a mature native/scientific DSP library. MFCC features describe sound; they do not contain lyric text.

**Future:** Validate against a reference library, normalize features, add delta/delta-delta coefficients, cache frames, and move heavy extraction to a worker/native backend.

### 5.11 Constrained DTW

**Why:** Singing speed varies. DTW can compare sequences despite local stretching/compression, while a window constraint limits implausible paths and runtime.

**How:** `src/dtw.js` fills a cost matrix using Euclidean frame distance, allows diagonal/up/left transitions, restricts cells to a Sakoe–Chiba-style window, then reconstructs the lowest-cost path and normalized cost.

**Files:** `src/dtw.js`, `src/mfcc-dtw.js`, `test/lrc.test.mjs`.

**Current limit:** DTW needs two acoustic sequences. Supplying only text and audio is not enough to create the second sequence.

**Future:** Alternative distances, normalization, multi-resolution DTW, pruning, memory optimization and benchmark comparisons.

### 5.12 Template-assisted line alignment

**Why:** This is the bridge from feature comparison to line-level timestamps. It makes the difficult assumption explicit: one acoustic feature template is supplied for each known lyric line.

**How:** `src/template-aligner.js` evaluates candidate audio segments against each line template with constrained DTW. A global dynamic-programming table chooses a monotonic sequence of segment boundaries under minimum/maximum lengths. The result includes start/end seconds and costs. `src/engine.js` exposes it as `template-mfcc-dtw`.

**Files:** `src/template-aligner.js`, `src/engine.js`, `src/dtw.js`, `test/lrc.test.mjs`.

**Current limit:** The project has not yet solved how to obtain templates automatically from ordinary lyrics. Current tests use synthetic vectors; this feature is not presented as finished automatic lyric recognition.

**Future:** Derive templates from verified anchors/vocal separation, compare candidate costs for confidence, handle silence/intro/outro, and integrate only after real-data evidence.

### 5.13 Private manifest import and review gate

**Why:** Your separate private copy already contains richer matching results than the generic folder audit. We need to use those results without placing audio, lyrics, or private paths in GitHub.

**How:** `src/private-manifest.js` parses quoted CSV safely and converts each row into a research candidate. `scripts/import-private-manifest.mjs` reads only `private_match_inventory.csv` plus the names in the copied `audio/` and `lyrics/` directories, preserves match/timestamp/special-version metadata, and writes an ignored JSON candidate file. It never copies or decodes source media. Each row records `audioExists` and `lyricExists` so a report claim cannot create a phantom pair. `benchmarkReady` stays false until manual reference timestamps exist.

**Files:** `src/private-manifest.js`, `scripts/import-private-manifest.mjs`, `benchmarks/REVIEW_GUIDE.md`, `.gitignore`.

**Current limit:** The importer cannot prove a filename match, vocal presence, or timestamp correctness. It is organization and safety tooling, not a replacement for listening review.

**Future:** Add an in-app review screen, import corrected timelines from LyricSync projects, attach duration/codec metadata, and produce benchmark cases only from explicitly approved rows.

### 5.14 Explainable profile combination experiment

**Why:** RMS energy alone is a weak boundary signal. The next non-ML experiment combines normalized RMS energy with spectral flux so the engine can test whether sudden spectral changes provide useful complementary evidence.

**How:** `src/audio-profiles.js` extracts finite RMS and spectral-flux arrays from PCM. `src/profile-fusion.js` resamples profiles to a common length, normalizes them independently, and applies explicit weights. `src/combined-aligner.js` sends the fused profile through the existing monotonic editable timeline heuristic. `src/engine.js` exposes this as `engine: "combined-profile"`.

**Experiment:** `scripts/run-engine-comparison.mjs` compares `energy-baseline` and `combined-profile` using the same reference timestamps and writes ignored results. `benchmarks/COMBINATION_EXPERIMENT.md` documents ownership, assumptions, and the real-data protocol.

**Limit:** This is still a candidate generator, not lyric recognition or ground truth. No learned model or internet connection is involved. Real evaluation needs rights-cleared audio and manually verified starts.

### 5.15 Reviewed timeline workflow hardening

**Why:** Manual stamping becomes error-prone when the selected row disappears below the scroll area or when a correction silently creates an impossible timeline.

**How:** `src/app.js` now scrolls the newly selected row into view after `T` stamping, seeks playback when a timestamp or lyric row is clicked, and rejects a timestamp earlier than the previous line. Rejections use a short bottom toast and restore the previous value; no sound or network request is used. Row actions keep accessible labels/tooltips while the clear action uses a trash icon.

**Dynamic shortcuts:** `src/settings.js` stores shortcut keys with the appearance settings. The Settings dialog captures a user-selected key for play/stop, stamp-next-line, and playback nudges, rejects duplicate assignments, and the global handler reads the saved values instead of hard-coded keys.

### 5.16 Boundary dynamic-programming experiment

`src/boundary-dp-aligner.js` is a separate deterministic segment optimizer. It chooses monotonic line boundaries using explicit duration-deviation and onset-reward costs. The reusable `boundary-dp` engine, fixture, runner, and rationale live alongside—not instead of—the other experiments. See `benchmarks/BOUNDARY_DP_EXPERIMENT.md` for the assumptions, wiring command, synthetic result, and real-data limitations.

### 5.17 Pitch/F0 experiment

`src/pitch-profile.js` is an independent bounded-autocorrelation estimator for voiced fundamental frequency and silence. It produces both per-frame pitch metadata and a voicedness profile that can be tested later as a fusion input. `benchmarks/PITCH_EXPERIMENT.md` documents its synthetic quality runner and why pitch alone is not lyric alignment.

### 5.18 Multi-profile combination experiment

`src/multi-profile-aligner.js` is a preserved adapter that combines energy, spectral flux, and pitch voicedness before boundary DP. It records component weights and keeps every underlying engine independent. See `benchmarks/MULTI_PROFILE_EXPERIMENT.md` for its isolated fixture, ablation plan, and non-ML limitations.

### 5.19 Common ablation evidence runner

`scripts/run-ablation-study.mjs` compares the preserved energy, profile-fusion, boundary-DP, and multi-profile engines on identical cases. It reports each method's metrics and MAE delta against the energy baseline. This is the evidence gate for later selection; it does not delete or silently replace any algorithm. See `benchmarks/ABLATION_EXPERIMENT.md`.

### 5.20 Real-data evaluation preparation

**Why:** Synthetic fixtures verify that an implementation is internally
consistent, but they cannot answer whether a song's recording, lyrics, and
downloaded timestamps actually belong together. The private collection also
contains instrumental/special versions and unverified lyric files, so using it
blindly would produce misleading accuracy claims.

**How:** `scripts/prepare-local-evaluation.mjs` selects a bounded set of
high-confidence, timestamped, non-special candidates from the private manifest,
checks that the referenced files exist, parses lyric files as UTF-8, and writes
ignored metadata-only stubs under `benchmarks/private/`. It preserves absolute
local paths for the user's machine but never copies audio or lyrics into Git.
The output records decoder availability and an explicit review object whose
three Boolean decisions remain `null` until a person listens.

**Boundary:** The current project has no Node-side MP3 decoder dependency and
this machine has no `ffmpeg`/`ffprobe` command. Chromium can still decode files
for playback and waveform extraction in the app. Automated acoustic benchmark
runs need a local PCM decoder adapter; this is the next implementation seam,
not a reason to couple the engine to Electron.

See `benchmarks/REAL_DATA_EVALUATION.md` for the exact NVM command, privacy
guarantees, and the small manual gate required before treating results as
ground truth.

The next seam is now implemented in `src/audio-decoder.mjs`: WAV/PCM decoding
is dependency-free, and a local FFmpeg process can be selected for compressed
formats. `scripts/run-local-alignment.mjs` feeds decoded samples into the same
profile and engine APIs used by synthetic experiments, writing only ignored
local results. Decoder choice stays outside `src/engine.js`, which preserves
future browser/mobile reuse.

### 5.21 Reference-template acquisition

`src/template-builder.js` closes the previously explicit template gap. Given a
manually verified reference recording and monotonic line start times, it slices
each line interval and extracts MFCC frames with a shared parameter set. The
new `scripts/run-reference-template-alignment.mjs` extracts matching MFCC
frames from a target recording and calls the existing `template-mfcc-dtw`
engine. The reference audio is supervision for timing only; lyric text is never
converted into an invented acoustic signal. `benchmarks/REFERENCE_TEMPLATE_EXPERIMENT.md`
documents the JSON shape, CLI, and failure cases.

The checked-in [`benchmarks/RESULTS_SUMMARY.md`](benchmarks/RESULTS_SUMMARY.md)
records the latest run of every current experiment. It is important that the
summary calls the current numbers synthetic: the runners prove that the
algorithms and metrics are wired together, but none of those numbers is a
measurement on the user's private songs. Real-song scoring starts only after a
vocal recording and its lyric line starts have been manually verified.

Experiment 08 (`benchmarks/ROBUSTNESS_EXPERIMENT.md`) extends this audit with
deterministic perturbations. It is an isolated failure-mode study, not a new
production engine and not a replacement for real recordings.

Experiment 09 (`benchmarks/PARAMETER_SWEEP_EXPERIMENT.md`) sweeps nearby engine
weights and ranks them by line-start error. Its output is diagnostic only:
synthetic winners are not silently made into application defaults.

## 6. How the complete system links together

```text
User selects local audio + TXT/LRC/pasted lyrics
             |
             v
index.html / src/app.js  ---- settings + playback + review
             |
             +--> src/lyrics.js --> src/domain.js (normalized LyricLine[])
             |
             +--> local PCM --> src/features.js (MFCC) / RMS profile
                                      |
                                      +--> src/energy-aligner.js
                                      |
                                      +--> src/dtw.js
                                              |
                                      src/template-aligner.js
             |
             v
       src/engine.js (structured timeline)
             |
             +--> src/lrc.js --> LRC file
             +--> src/project-store.mjs --> local project folders
             +--> src/logger.js --> readable log
```

The benchmark path calls the same engine without the UI:

```text
dataset JSON -> scripts/run-benchmark.mjs -> src/engine.js
             -> src/metrics.js -> JSON + Markdown result
```

The private-library path is separate from synchronization:

```text
Music folder -> scripts/audit-library.mjs -> ignored local manifest
             -> human review -> approved ground-truth dataset

Private evaluation preparation stays metadata-only:

```text
private_match_inventory.csv -> scripts/prepare-local-evaluation.mjs
                            -> ignored local-evaluation.json stubs
                            -> optional decoder adapter -> same src/engine.js APIs
```
```

## 7. What “finished” means right now

| Area | State | Honest interpretation |
| --- | :---: | --- |
| Offline desktop foundation | ✅ | The app can run locally and does not require internet during normal use. |
| Unicode/TXT/LRC input | ✅ | Native-language text is preserved and parsed. |
| Manual line timing and LRC | ✅ | A user can create and correct line-level LRC. |
| RMS baseline | 🟡 | Produces editable guesses; real-song accuracy is not established. |
| Benchmark code | 🟡 | The measurement machinery works; synthetic data is not research evidence. |
| MFCC | 🟡 | Extractor works and is tested; production performance/reference validation remains. |
| DTW | 🟡 | Constrained sequence comparison works; text-to-acoustic mapping remains. |
| Template line alignment | 🟡 | Algorithm works with templates; template acquisition is unresolved. |
| Vocal separation | ⏳ | Required capability, not implemented yet. |
| Real private evaluation preparation | 🟡 | Local metadata-only candidate stubs are generated; a PCM decoder and human-verified reference timestamps are still required for accuracy claims. |
| Fully automatic lyric synchronization | ⏳ | The reusable engines are implemented as candidates; real-data comparison, confidence calibration and difficult-recording fallbacks remain. |
| Online lyrics/LRC search | 🔭 | Optional future connector, never a core dependency. |

## 8. Recommended next work

1. Run `scripts/prepare-local-evaluation.mjs` against the private copy; it is now the repeatable preparation command.
2. Manually select a small set of clearly matching, vocal, rights-cleared or private evaluation pairs from the generated stubs.
3. Verify line timestamps by listening and record them as ground truth separately from downloaded LRC files.
4. Add a local PCM decoder adapter (FFmpeg is the simplest optional implementation) and benchmark the engines on those pairs.
5. Design how acoustic templates are obtained, then compare template-MFCC-DTW against the profile engines.
6. Add optional vocal separation only after measuring whether its cost improves results.

## 9. Commands for a beginner

Use NVM Node 22 explicitly:

```powershell
$env:Path = 'C:\Users\aksha\AppData\Local\nvm\v22.23.2;' + $env:Path
& 'C:\Users\aksha\AppData\Local\nvm\v22.23.2\npm.cmd' run test
& 'C:\Users\aksha\AppData\Local\nvm\v22.23.2\npm.cmd' run desktop
& 'C:\Users\aksha\AppData\Local\nvm\v22.23.2\npm.cmd' run audit-library -- 'C:\Users\aksha\Music'
```

The audit manifest and benchmark results are ignored by Git. That is intentional: private file paths, personal lyrics, audio, generated caches and experimental outputs do not belong in the public repository.

## 10. GitHub history

The canonical repository is [ACE4AKSHAY/TimeStamper](https://github.com/ACE4AKSHAY/TimeStamper). The current local `main` branch tracks `origin/main`, and each milestone above has been pushed in order. This preserves the reasoning trail: a reviewer can start at the foundation commit and inspect one research decision at a time.
