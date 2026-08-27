# LyricSync project status and roadmap

This is the plain-language project record for **Lightweight Offline Audio-Text Synchronization Engine and LRC Generator**. It explains what is in the repository today, what comes next, and how every part of the original brief is being tracked.

## What has been built so far

The repository contains an offline-first Electron desktop foundation. It imports local audio, TXT and LRC lyrics; preserves Unicode lyrics (including Telugu, Hindi, Tamil, and other native scripts); provides waveform playback and manual timestamping; exports LRC; stores a small local project file; and creates human-readable logs.

The UI has exact seek/stamp time entry, click-and-drag waveform seeking, rewind/fast-forward hold controls, reset-to-start, accessible labels/tooltips, configurable themes/waveform colours/text size, keyboard shortcuts, and row controls to stamp, clear, insert or duplicate lines. The first experimental automatic layer is an RMS-energy baseline: it makes **editable initial estimates** only, not a claim that the app recognizes sung words.

## How to use the repository

The active Node runtime is managed by NVM. In PowerShell, run:

```powershell
$env:Path = 'C:\Users\aksha\AppData\Local\nvm\v22.23.2;' + $env:Path
& 'C:\Users\aksha\AppData\Local\nvm\v22.23.2\npm.cmd' run desktop
```

Run tests with the same prefix and `npm.cmd run test`.

## Status legend

| Symbol | Meaning |
| --- | --- |
| ✅ | Implemented and locally tested |
| 🟡 | Started / partial; needs more work or validation |
| ⏳ | Planned next work |
| 🔭 | Future scope / deliberate later phase |
| ⚖️ | Decision, research, or legal item—not a feature to code yet |

## Resources the project needs

| Stage | Required resources | What is and is not required |
| --- | --- | --- |
| Use the current desktop app | A Windows/macOS/Linux computer, local audio files, TXT/LRC lyrics, and NVM Node 22 for development | No internet, GPU, cloud account, paid API, or dataset is required for manual editing and LRC export. |
| Develop/run the desktop shell | Electron 37 installed through `package.json`; NVM-managed Node/npm | Internet is needed only to install development dependencies. The running app reads local files and works offline. |
| Support more audio formats | FFmpeg and a local audio-normalization adapter | This is a future packaging/runtime dependency; it is not needed for the current browser-codec-supported inputs. |
| Build synchronization research | Rights-cleared audio, correct UTF-8 lyrics, manually verified line timestamps, metadata, and repeatable machine measurements | A dataset is needed for scientific claims, regression tests, and comparing algorithms—not for ordinary app use. |
| Add vocal separation | A pluggable local separator such as Demucs, model storage, CPU/RAM/disk budget, and test tracks | GPU should remain optional; model downloads are setup-time and the offline app must continue to work without the separator. |
| Future mobile/other OS clients | Platform-neutral engine API plus a client-specific UI/audio layer | Mobile packaging should reuse the engine; it should not make the core depend on Electron. |

### Dataset answer in plain language

You do **not** need a dataset to use LyricSync or to manually create an LRC. You **do** need one to answer the research question honestly: whether energy, MFCC/DTW, vocal separation, or another method is accurate and efficient. Start with the checked-in synthetic fixture only to verify code. For real experiments, keep a small private or rights-cleared set outside Git (20–30 varied tracks is a practical starting point), with UTF-8 lyrics, manually verified line starts, language/genre/recording metadata, and a note of verification. Never use generated timestamps as ground truth, and do not commit copyrighted audio, private lyrics, feature caches, or generated results.

## Original requirements traceability table

| # | Original brief item | Status | Current position / next action |
| ---: | --- | :---: | --- |
| 1 | Project overview | 🟡 | Offline audio-text/LRC foundation is built; automatic synchronization remains experimental. |
| 2 | Two connected projects | 🟡 | Desktop application exists; reusable engine modules have begun. |
| 3 | Separate algorithm component | 🟡 | Platform-neutral `synchronize()` entry point now exists; more engines and packaging are next. |
| 4 | Patent / open-source consideration | ⚖️ | Keep the repository private until a qualified professional advises on disclosure/patent strategy. |
| 5 | Core project intention | 🟡 | Offline/local goal is implemented as the architectural default. |
| 6 | Primary problem | 🟡 | Existing TXT/LRC lyrics are accepted; precise audio-to-line alignment needs continued research. |
| 7 | Audio input | 🟡 | Local browser/Electron-supported formats are accepted; FFmpeg normalization is planned. |
| 8 | Lyrics input | ✅ | TXT, LRC and pasted/direct text work. |
| 9 | Internal lyric representation | 🟡 | Lines have IDs, normalized text, timing, confidence and method fields; document metadata needs expansion. |
| 10 | Primary LRC output | ✅ | Valid centisecond LRC export works. |
| 11 | Secondary outputs | 🔭 | SRT, VTT, ASS and enhanced/word LRC are deferred. |
| 12 | Vocal separation capability | ⏳ | Required for a later milestone; not yet integrated. |
| 13 | Why vocal separation | ⏳ | Will be measured against full-mix results in benchmarks. |
| 14 | Vocal separation implementation | ⏳ | Define pluggable Demucs/FutureSeparator adapter after baseline evaluation. |
| 15 | User processing modes | ⏳ | Fast/Balanced/Vocal-assisted modes come with separator integration. |
| 16 | Core pipeline | 🟡 | Local input, parsing, waveform/RMS, timeline and LRC export work; remaining analysis/alignment stages are pending. |
| 17 | Audio analysis | 🟡 | Waveform and RMS are implemented; other features await experiments. |
| 18 | Waveform | ✅ | Visual, clickable/draggable seekable waveform is implemented. |
| 19 | RMS / energy | ✅ | RMS energy extraction and a clearly labelled initial-timing baseline are implemented. |
| 20 | Spectrogram | ⏳ | Add only as a measurable feature extractor. |
| 21 | Mel spectrogram | ⏳ | Future research comparison. |
| 22 | MFCC | ⏳ | Future research comparison. |
| 23 | Pitch / F0 | ⏳ | Future research comparison. |
| 24 | Spectral features | ⏳ | Future research comparison. |
| 25 | Chroma | ⏳ | Future structure-analysis comparison. |
| 26 | Onset detection | ⏳ | Future boundary-support comparison. |
| 27 | Audio feature fusion | ⏳ | Add only after individual extractors are benchmarked. |
| 28 | Alignment engine | 🟡 | Platform-neutral energy-baseline `synchronize()` interface exists; alternate engines are next. |
| 29 | Dynamic Time Warping | ⏳ | Planned after MFCC feature extraction. |
| 30 | Dynamic programming | ⏳ | Planned after baseline metrics exist. |
| 31 | Structure-aware alignment | 🔭 | Later research phase. |
| 32 | Lyric-aware constraints | ⏳ | Global ordering is preserved; stronger constraints await a real alignment engine. |
| 33 | Timestamp generation | 🟡 | Manual timestamps and editable energy estimates work. |
| 34 | Timestamp refinement | ⏳ | Requires a feature similarity/cost function. |
| 35 | Confidence | 🟡 | Baseline records low confidence; algorithmic confidence model is pending. |
| 36 | Human review | ✅ | Playback, waveform, timeline selection and direct timestamp editing work. |
| 37 | Fast correction | 🟡 | Exact time entry, custom adjustment and insert/duplicate work; undo/redo and tap workflow are next. |
| 38 | Visualization | 🟡 | Waveform is done; research plots are later. |
| 39 | Local project storage | 🟡 | Browser download and Node `ProjectStore` structured directory are present; feature caches are next. |
| 40 | Storage principle | ✅ | Original audio is referenced, not copied into project JSON. |
| 41 | Cache design | ⏳ | Add file-backed feature cache after desktop storage structure. |
| 42 | Reproducibility | 🟡 | Method/confidence fields are saved; full run configuration record is next. |
| 43 | Human-readable logging | ✅ | Local downloadable activity log is implemented. |
| 44 | Log levels | 🟡 | INFO/WARNING/ERROR are used; DEBUG preference is pending. |
| 45 | Error handling | 🟡 | Import/parse/export errors are surfaced and logged; pipeline-specific failures arrive with those modules. |
| 46 | Git repository | ✅ | Git repository exists; initial project commit is being created now. |
| 47 | Git structure | 🟡 | Source, tests and documentation exist; experiments/datasets structure is pending. |
| 48 | Git branching | 🟡 | Stable `main` branch will be created; later work uses `feature/*` and `experiment/*`. |
| 49 | Git commits | ✅ | This milestone will have a descriptive initial commit. |
| 50 | Testing | 🟡 | Automated unit tests exist; integration/desktop UI tests are next. |
| 51 | Unit tests | 🟡 | LRC conversion, parsing, Unicode, one-line lyrics and energy baseline are covered. |
| 52 | Integration tests | ⏳ | Add audio + lyrics + export fixture tests. |
| 53 | Benchmark dataset | 🟡 | Private library-audit manifest tool now inventories local pairs without copying media; rights-cleared ground truth is next. |
| 54 | Dataset categories | 🟡 | Manifest captures language-independent lyric/timestamp/instrumental review flags; genre/recording metadata is next. |
| 55 | Ground truth | ⏳ | Manually verify candidate pairs; never assume downloaded LRC timestamps are ground truth. |
| 56 | Experiment 1: energy baseline | 🟡 | Implemented as initial timing; reproducible metrics runner and synthetic smoke fixture now exist; rights-cleared audio evaluation is next. |
| 57 | Experiment 2: spectral | ⏳ | Planned. |
| 58 | Experiment 3: MFCC | ⏳ | Planned. |
| 59 | Experiment 4: pitch | ⏳ | Planned. |
| 60 | Experiment 5: combined features | ⏳ | Planned. |
| 61 | Experiment 6: separation comparison | ⏳ | Planned with vocal separator. |
| 62 | Experiment 7: structure-aware | 🔭 | Later research phase. |
| 63 | Experiment 8: optional AI baseline | 🔭 | Later comparison only; not the primary design. |
| 64 | Experimental principle | ✅ | Current energy approach is explicitly a measured hypothesis, not assumed accurate. |
| 65 | Accuracy metrics | 🟡 | MAE, median AE, RMSE and 0.25/0.50/1.00-second thresholds are implemented in `src/metrics.js`. |
| 66 | Performance metrics | 🟡 | Benchmark runner records runtime; RTF and stage timings are next. |
| 67 | Resource metrics | 🟡 | Benchmark runner records observed Node heap; CPU/GPU/disk measurements are next. |
| 68 | UX metrics | ⏳ | Track corrections and review time after usable automatic alignment exists. |
| 69 | Failure analysis | ⏳ | Add failure categories to benchmark reports. |
| 70 | Multilingual support | ✅ | UTF-8/Unicode lyric storage and parsing are tested; performance measurement by language is pending. |
| 71 | Performance design | 🟡 | Downsampled waveform and asynchronous decoding exist; workers/caching/chunks are next. |
| 72 | GUI thread | 🟡 | Browser async decoding prevents basic blocking; heavy engines need workers/processes. |
| 73 | Processing status | ⏳ | Add formal pipeline progress UI when multi-stage jobs exist. |
| 74 | Cancellation | ⏳ | Add safe job cancellation with worker-based processing. |
| 75 | Modular vocal separation | ⏳ | Create interface when separator work starts. |
| 76 | Modular feature extraction | 🟡 | RMS is separate; formal extractor interface and additional extractors are next. |
| 77 | Modular alignment | 🟡 | Energy aligner is standalone; common contract and alternate engines are next. |
| 78 | Modular export | 🟡 | LRC exporter is separate; other exporters are future modules. |
| 79 | Modular storage | 🟡 | Node `ProjectStore` now creates project/audio/lyrics/features/alignment/timeline/etc. folders; cache policy is next. |
| 80 | Logging module | ✅ | `ProjectLogger` is a standalone module. |
| 81 | Experiment reproducibility | ⏳ | Add dataset/version/machine/config captured runs. |
| 82 | Results format | 🟡 | Energy benchmark writes JSON and Markdown; CSV is next. |
| 83 | Research report | ⏳ | Draft after benchmark evidence exists. |
| 84 | Existing-system research | ⏳ | Research architectures/licensing/limitations before implementing advanced engines. |
| 85 | Do not copy existing projects | ✅ | Current implementation is independent and modular. |
| 86 | Differentiation | 🟡 | Offline, local, modular, explainable and selectable processing cost guide current design. |
| 87 | Software cost | ✅ | Current stack is local/open-source; no cloud API is required. |
| 88 | Internet requirement | ✅ | Core workflow runs offline; online lookup remains an optional future connector. |
| 89 | Privacy | ✅ | Audio/lyrics stay local in the core workflow. |
| 90 | Project directory | 🟡 | Source layout exists; user project/cache/models/dataset directories are pending. |
| 91 | Models directory | 🔭 | Add only when optional separator/alignment models are introduced. |
| 92 | Configuration | 🟡 | Local general UI settings exist; audio/alignment configuration is pending. |
| 93 | Default configuration | 🟡 | Current defaults favour local manual correction; algorithm defaults need benchmarks. |
| 94 | CLI | ⏳ | Add after platform-neutral engine API exists. |
| 95 | Batch processing | 🔭 | Future feature after reliable non-interactive engine. |
| 96 | Library/API | 🟡 | Platform-neutral `synchronize()` API now exists; extract/publish a formal package after more engines stabilize. |
| 97 | License | ⚖️ | Decide only after dependency, commercial and patent strategy review. |
| 98 | Development phases | 🟡 | Phases 1–3 foundation/RMS baseline are underway; do not jump to advanced phases prematurely. |
| 99 | Version 0.1 | ✅ | Audio import, TXT/LRC/paste, waveform, playback, manual timestamping, LRC, project save and logs are present. |
| 100 | Version 0.2 | 🟡 | RMS, initial automatic timing, metrics and synthetic benchmark are present; rights-cleared dataset validation is next. |
| 101 | Version 0.3 | ⏳ | Spectrogram, MFCC, DTW and comparison planned. |
| 102 | Version 0.4 | ⏳ | Vocal separation and full-vs-vocal measurement planned. |
| 103 | Version 0.5 | ⏳ | Multiple engines and benchmarking planned. |
| 104 | Version 1.0 | 🔭 | Target after validated line-level synchronization, review workflow, storage, CLI and benchmarks. |
| 105 | Future version | 🔭 | Word LRC, karaoke, subtitles, optional AI and engine selection later. |
| 106 | Do not build everything at once | ✅ | Work is being staged: manual editor → RMS baseline → measurements → advanced engines. |
| 107 | First technical milestone | ✅ | Song + lyrics → editable timeline → LRC is implemented. |
| 108 | Second technical milestone | 🟡 | Simple automatic initial timestamps are implemented; now benchmark them. |
| 109 | Third technical milestone | ⏳ | MFCC + DTW comparison planned. |
| 110 | Fourth technical milestone | ⏳ | Vocal separation comparison planned. |
| 111 | Fifth technical milestone | 🔭 | Robust combined aligner later. |
| 112 | Sixth technical milestone | 🟡 | Benchmark tooling and private-library manifest exist; rights-cleared dataset expansion follows. |
| 113 | Success criteria | 🟡 | Local import, editing, LRC, privacy, logs and modularity are met; automatic accuracy, separation and benchmarks remain. |
| 114 | Final research question | ⏳ | Answer with measured benchmark results—not assumptions. |
| 115 | Final project aim | 🟡 | Architecture follows the aim; required experimental proof and advanced stages remain. |
| 116 | Final project identity | ✅ | Project is described as an audio-text synchronization engine and LRC generator, not merely an LRC generator. |
| 117 | Design principle | ✅ | User workflow is kept separate from internal processing modules. |
| 118 | Technical principle | ✅ | Energy baseline is marked experimental and is testable/replaceable. |
| 119 | Product principle | 🟡 | UI already follows select/import → review → export; processing-mode choice arrives with separation. |
| 120 | Final vision | 🔭 | Reusable timestamped-text technology remains the long-term direction after core lyric alignment is proven. |

## Recommended next steps

1. Review the private library manifest, exclude instrumental/mismatched/unverified items, and create a small rights-cleared ground-truth set.
2. Add a rights-cleared dataset manifest and run the energy benchmark against verified pairs.
3. Add spectrogram/MFCC extractors and a constrained DTW comparison.
4. Integrate a modular local vocal separator and compare full-mix versus vocal-assisted results.
5. Add packaging/release automation only after the desktop workflow is stable.

## Version-history rule

Each completed, tested milestone should receive one small descriptive commit. Do not use commits as a place to store generated audio, caches, logs, copyrighted songs or private project data. Git tracks source code, documentation and tests; project data stays local.
