# MFCC + DTW milestone — detailed beginner guide

This document explains exactly what was added in the MFCC/DTW-to-line-timestamp step, why each file exists, and how the pieces connect. It is written so you can review the project even if you are learning software development by experimenting.

## The problem this milestone addresses

MFCC describes the sound at short time windows. DTW compares two sequences even when one is stretched or compressed in time. Neither operation understands a Telugu, Hindi, Japanese, English, or any other lyric by itself. To produce a timestamp for a known lyric line, the system needs an **acoustic template** for that line: a feature sequence representing the sound expected for that line.

The new template aligner accepts one feature template per lyric line and finds a globally ordered segmentation of the audio feature sequence. This is an explicit research boundary, not a hidden claim of speech recognition. A template may eventually come from a manually verified reference, a vocal-isolated clip, or an optional phonetic/acoustic model. The current milestone tests the mechanism with synthetic feature sequences.

## Files and their links

| File | What it does | How it links to the rest |
| --- | --- | --- |
| `src/features.js` | Converts PCM audio into configurable MFCC frame vectors using a local FFT, Mel filter bank and DCT. | A future audio loader supplies its `frames` to DTW or the template aligner. It has no Electron or network dependency. |
| `src/dtw.js` | Computes a monotonic, window-constrained DTW path and normalized cost between two feature sequences. | `src/mfcc-dtw.js` and `src/template-aligner.js` call it as the common temporal-comparison primitive. |
| `src/mfcc-dtw.js` | Adapts MFCC result objects or raw frame arrays to DTW and labels the method `mfcc_dtw`. | Useful for sequence comparison experiments; it intentionally does not invent lyric timestamps. |
| `src/template-aligner.js` | Uses dynamic programming over line order and repeated constrained DTW calls to choose start/end frames for each lyric template. | Receives audio frames and line templates, then returns line-level segments with seconds and costs. |
| `src/engine.js` | Provides the platform-neutral `synchronize()` entry point. | The desktop UI, future CLI, and future mobile client can call the same engine contract. It now supports `energy-baseline` and `template-mfcc-dtw`. |
| `test/lrc.test.mjs` | Tests MFCC finiteness, DTW path shape, template segmentation and engine output. | Protects the algorithm while the UI and future Python/native implementations evolve. |
| `PROJECT_STATUS.md` | Tracks the original 120 requirements and milestone state. | This is the project-level source of truth for what is finished versus planned. |

## Data flow

```text
local audio
  -> PCM samples
  -> src/features.js (MFCC frames)
  -> src/template-aligner.js
       + lyric line acoustic templates
       + src/dtw.js for each candidate segment
       + dynamic programming for global line order
  -> start/end seconds per known lyric line
  -> src/lrc.js (existing exporter)
  -> synchronized LRC
```

The current desktop UI still uses the energy baseline for its initial-timing button. Template alignment is available through the engine API first so it can be benchmarked safely before exposing a misleading one-click UI workflow.

## Why dynamic programming is used

Searching each lyric line independently could assign several lines to the same audio region or put a later line before an earlier one. The template aligner stores the best cost for every `(number of lines completed, audio frame reached)` state. It only extends from an earlier frame, so the final result is globally ordered and covers the audio sequence under configured minimum/maximum segment lengths.

## What was tested

The tests use tiny synthetic vectors rather than songs. They verify that:

1. MFCC output contains finite configurable vectors.
2. DTW returns a path beginning and ending at the expected sequence positions.
3. Template alignment produces non-overlapping, monotonic line segments.
4. The public engine API returns line timestamps and method metadata.

No personal music or lyrics were copied into the repository. Your local collection remains useful later, but real evaluation requires manually verified line times and a decision about whether each recording is vocal, instrumental, mismatched, or uncertain.

## What remains before claiming automatic synchronization

- Decide how line templates are obtained without requiring the user to record every line.
- Add actual rights-cleared/verified song fixtures and compare energy versus MFCC-DTW.
- Add confidence from competing segment costs and temporal consistency.
- Add vocal separation as an optional preprocessing backend.
- Integrate this engine into the UI only after the benchmarks show it helps.

This staged approach is intentional: the code now exposes the difficult assumption instead of hiding it behind a button that would appear more intelligent than the evidence supports.
