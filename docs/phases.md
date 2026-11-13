# Implementation phases and file map

This document is the compact history of the reusable engine work. Every phase
was committed independently and pushed to `main`; generated benchmark output
and private music files stay ignored and outside the repository.

| Phase | Commit    | What was built                                       | Main files                                                            | Why it exists                                                                                                |
| ----- | --------- | ---------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 0     | `157e467` | Test, CI, format and path hygiene                    | `test/*`, CI config, `benchmarks/README.md`                           | Makes later changes repeatable and removes machine-specific paths.                                           |
| 1     | `662158e` | Public request/result/form contracts                 | `src/contracts/index.js`                                              | Gives desktop, CLI and future mobile clients the same validated boundary.                                    |
| 2     | `4346e93` | Stable engine registry and dispatcher                | `src/engine.js`, `src/index.js`                                       | Keeps every experiment selectable without coupling the UI to one algorithm.                                  |
| 3     | `84829d7` | Language-neutral form detection                      | `src/forms/*`                                                         | Detects timing level, script and vocal/instrumental clues without understanding lyric meaning.               |
| 4     | `420dc41` | Timed-LRC retiming                                   | `src/retime-lrc.js`                                                   | Uses existing timestamps as an anchor and estimates bounded shift/drift before asking for review.            |
| 5     | `9d5f28b` | Form-aware routing and consensus fusion              | `src/router/*`                                                        | Chooses appropriate engines, refuses likely instrumentals, and exposes disagreement diagnostics.             |
| 6     | `3d2ee51` | Unicode-safe word timing and structure checks        | `src/word-timing.js`, `src/enhanced-lrc.js`, `src/structure-check.js` | Supports native scripts and repeated sections without language identification.                               |
| 7     | `9728543` | Optional plugin and CTC contracts                    | `src/plugins/*`                                                       | Defines future separators/aligners without bundling models or making them required.                          |
| 8     | `ce84437` | Synthetic evaluation workflow                        | `scripts/evaluate.mjs`, `docs/evaluation.md`                          | Checks engine compatibility and metrics while clearly separating synthetic evidence from real-song accuracy. |
| 9     | `d6ffd1d` | UI integration, review triage and bounded history    | `src/ui/alignment-panel.js`, `src/ui/app.js`, `index.html`            | Makes the router usable, shows confidence/review flags, filters lines, and supports undo/redo.               |
| 10    | current   | Local correction journal and explicit learning hints | `src/learning/correction-store.js`, `src/router/auto-form.js`         | Learns only from verified local edits; hints are bounded and opt-in, never uploaded or silently applied.     |

## Current runtime flow

```text
local audio + TXT/LRC
  -> browser/Electron decode
  -> energy + spectral flux + voicedness profiles
  -> synchronize({ engine: "auto-form" })
  -> form detection and engine plan
  -> retime-LRC / vocal-gated DP / pause-aware DP / text-weighted DP
  -> consensus start times + confidence + review reasons
  -> editable timeline and LRC export
```

The UI's **Initial timing** button remains a simple baseline. **Automatic
timing** now uses the form-aware `auto-form` route. The reference-assisted
MFCC/constrained-DTW path remains a separate, explicit workflow because it
needs a separately verified recording and is more expensive.

## What the algorithm does not claim

The engine does not identify the lyric language, understand word meaning, or
prove which singer is active. It uses timing already present in an LRC when
available, and otherwise combines deterministic audio boundaries with text
length and structure priors. Background vocals, choruses and instrumentals can
still create false acoustic boundaries; `confidence`, `reviewRequired`, and
the review filter make that uncertainty visible instead of hiding it.

## Local correction learning

`src/learning/correction-store.js` stores only numeric pairs:

```text
engine + form + predictedTime + correctedTime + errorSeconds
```

It does not store audio or lyric text. After a minimum number of corrections,
`deriveLearningHints()` returns a bounded per-engine offset. A caller must pass
those hints explicitly as `options.learningHints` to `auto-form`; the router
clamps the result back to monotonic order and records that learning was used.
This is calibration support, not machine learning and not a replacement for
verified real-song evaluation.

## Remaining evidence gate

All code phases are complete for the current offline-first scope. The remaining
work is evidence, not missing plumbing: run the real evaluator on independently
verified songs (including multiple languages, normal vocal tracks, covers/live
recordings, mixes and instrumentals), compare MAE and review rates, then decide
which engine defaults deserve promotion. No public dataset, model, license, or
network service has been selected by this repository.
