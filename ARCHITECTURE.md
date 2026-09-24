# LyricSync architecture and recreation guide

## The actual running algorithm

The reusable engine is [`src/engine.js`](src/engine.js). Its public function is
`synchronize(input)`. It receives normalized lyric lines, an audio duration,
and extracted audio profiles, then returns an editable set of line start/end
times. The stable facade is [`src/index.js`](src/index.js), so a future desktop,
mobile, or native client can import the same API without importing Electron.

The desktop execution path is:

```text
index.html
  -> src/ui/app.js
     -> local audio decode + waveform/RMS extraction
     -> selected timing action
        -> Initial timing: src/energy-aligner.js
        -> Automatic timing: src/automatic-aligner.js
           -> vocal-gated / combined-profile / adaptive Boundary-DP route
        -> Reference alignment: src/alignment-worker.js
           -> src/reference-template-aligner.js
              -> MFCC + constrained DTW + editable timeline
     -> timeline editor
     -> src/lrc.js -> exported LRC
```

The current desktop waveform extraction supplies RMS energy, so **Automatic
timing** currently selects its transparent energy fallback. The reusable API
can select the vocal-gated or combined-profile route when voicedness and
spectral-flux profiles are supplied. This is deterministic signal processing,
not AI, speech recognition, or language recognition.

## Source layout

```text
src/
├─ ui/
│  ├─ app.js                 Desktop/browser UI and event wiring
│  └─ settings.js            Local appearance, shortcut, and online settings
├─ online/
│  ├─ online-provider.js     Provider contracts and source adapters
│  └─ online-cache.js        Expiring local-only result cache
├─ index.js                  Stable public API facade
├─ engine.js                 Engine dispatcher and reusable synchronize()
├─ automatic-aligner.js      Explainable profile-based route selection
├─ domain.js / lyrics.js     Project model and TXT/LRC input normalization
├─ lrc.js / time-utils.js    LRC export and exact time parsing
├─ audio-*.js / features.js  Audio decoding, profiles, MFCC, and caches
├─ *-aligner.js              Independent algorithm candidates and experiments
├─ reference-*.js             Verified-reference MFCC/DTW workflow
└─ storage.js / logger.js     Project files and human-readable activity log
```

The many `*-aligner.js` files are deliberately kept as separate candidates:
each is a reproducible experiment with a different hypothesis. Combining them
into one large file would make it harder to compare, disable, or reuse a method.
The UI and online files are grouped because they are product infrastructure,
not separate alignment hypotheses.

## Minimal recreation

```js
import { parseLyrics, synchronize, exportLrc } from "./src/index.js";

const lyrics = parseLyrics("hello\nworld").lines;
const profiles = { energy: [0.1, 0.9, 0.2, 0.8, 0.2] };
const result = synchronize({
  engine: "automatic",
  lyrics,
  duration: 10,
  parameters: { profiles },
});

const lrc = exportLrc({
  metadata: { title: "Example", artist: "", album: "", language: "" },
  timeline: { lines: result.lines },
});
```

For desktop development, use the NVM runtime documented in
[`OFFLINE_SETUP.md`](OFFLINE_SETUP.md), then run `npm run desktop`. For engine
verification, run `npm test`, `npm run smoke-test`, and
`npm run check-compatibility`.

## What is and is not loaded

- Offline editing does not require the online providers; online access is
  opt-in and isolated under `src/online/`.
- The reference-template workflow is explicit and CPU-heavy; it runs in a
  worker in the desktop UI so normal editing stays responsive.
- No audio, private lyrics, cache output, or generated benchmark JSON belongs
  in Git. The source tree contains only reusable code, tests, and documentation.
