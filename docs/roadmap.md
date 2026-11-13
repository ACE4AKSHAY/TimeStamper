# LyricSync implementation plan

This is the practical build order for recreating and extending the project.
It separates code that already exists from work that still needs evidence or
user-provided recordings.

## 1. Stable foundation — implemented

**Goal:** make a useful offline desktop editor before adding research code.

Files and responsibilities:

- `index.html` — accessible application structure.
- `src/ui/app.js` — playback, waveform, timeline editing, export actions.
- `src/ui/settings.js` — local themes, shortcuts, source switches and motion preference.
- `src/domain.js` — project and lyric-line data model.
- `src/lyrics.js` — TXT/LRC parsing with Unicode preservation.
- `src/lrc.js` — centisecond LRC export.
- `src/storage.js` — human-readable project save/open.

Acceptance checks:

```powershell
npm test
npm run smoke-test
npm run check-runtime
npm run check-compatibility
```

## 2. Explainable automatic timing — implemented, still experimental

**Goal:** produce editable estimates without AI or language recognition.

The reusable entry point is `src/engine.js:synchronize()`. The `automatic`
route in `src/automatic-aligner.js` chooses:

1. adaptive vocal-gated Boundary-DP when voicedness is available;
2. combined energy/spectral-flux timing when spectral flux is available;
3. adaptive Boundary-DP as an energy-only fallback.

Supporting methods remain separate under `src/*-aligner.js` so each experiment
can be measured independently. The desktop Automatic timing action now supplies
RMS energy, spectral flux and heuristic voicedness to the form-aware `auto-form`
route. It shows confidence and review flags; generated times remain editable.

## 3. Reference-assisted high-accuracy path — implemented, evidence pending

**Goal:** align a target recording using a separately verified recording and LRC.

```text
verified reference audio + reference starts
  → MFCC line templates
  → target MFCC frames
  → constrained DTW
  → optional duration scaling/refinement/consensus
  → confidence diagnostics + editable timeline
```

Main files:

- `src/reference-template-aligner.js`
- `src/template-builder.js`
- `src/template-aligner.js`
- `src/dtw.js` and `src/dtw-banded.js`
- `src/alignment-worker.js`

The implementation is ready. Independent cover/live/remix pairs are required
before selecting production parameters or claiming accuracy.

## 4. Desktop routing and review — implemented

**Goal:** make the desktop Automatic timing action use the same richer route
that the reusable API already supports.

Planned work:

1. Extract RMS energy, spectral flux and voicedness in the browser decode pass.
2. Pass the profiles to `synchronize({ engine: "auto-form" })`.
3. Display route, confidence, reasons and a needs-review filter.
4. Keep Initial timing unchanged as a baseline comparison.
5. Provide bounded undo/redo for timeline edits.

Acceptance criteria:

- Offline operation remains unchanged.
- No new runtime dependency is required.
- Long reference alignment remains in a worker; lightweight profile extraction
  stays asynchronous around the browser decode step.
- Existing 72+ tests and smoke checks continue to pass.

## 5. Evidence and calibration — requires verified recordings

Use 5–10 manually checked normal vocal songs first, then add:

- a long-intro song;
- an instrumental-heavy song;
- a cover or live version;
- a slowed/remix or alternate mix;
- at least two lyric scripts.

For each case, keep the audio and verified reference outside Git. Record line
starts, recording type, language, duration difference and whether vocals are
present. Run the pair evaluator and compare MAE, median error, 250/500 ms
coverage, confidence buckets and runtime.

Do not promote a default based only on synthetic fixtures or identical
reference/target self-tests.

## 6. Optional quality improvements — after evidence

Only add these if measurements justify their cost:

- local vocal separation adapter (optional model, never required for offline editing);
- automatic low-confidence review queue;
- better MFCC normalization/tempo scaling based on alternate-pair results;
- worker-based extraction and progress reporting for long files;
- packaging and release automation.

Result deduplication for online lyric providers is intentionally not part of the
current plan.

## 7. Local correction calibration — implemented, optional

`src/learning/correction-store.js` records only numeric prediction-versus-edit
differences. After a minimum sample count it can produce bounded per-engine
offset hints. The router consumes these only when a caller explicitly passes
`parameters.learningHints`; it never uploads data or silently changes defaults.
See [`phases.md`](phases.md) and [`correction-learning.md`](correction-learning.md).

## 8. Evidence gate — next work after code completion

The remaining work is real-data validation: independently verify local audio/LRC
pairs, run the private evaluator, and compare line-level error and review rates.
Synthetic tests prove deterministic code behavior only; they do not prove song
accuracy.

## 7. Recreate the engine from scratch

Start with the stable facade:

```js
import { parseLyrics, synchronize, exportLrc } from "./src/index.js";

const lyrics = parseLyrics("first line\nsecond line").lines;
const result = synchronize({
  engine: "automatic",
  lyrics,
  duration: 30,
  parameters: { profiles: { energy: [0.1, 0.8, 0.2, 0.9] } },
});

const output = exportLrc({
  metadata: { title: "Demo", artist: "", album: "", language: "" },
  timeline: { lines: result.lines },
});
```

The complete data-flow diagram and module map are in
[`architecture.md`](architecture.md).
