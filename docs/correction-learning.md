# Local correction journal

## Purpose

Automatic alignment produces hypotheses. When a person changes a timestamp,
that edit is useful calibration evidence, but it is also private music data.
The correction journal therefore stores only the numeric difference between a
prediction and a verified edit. It is local-only and optional.

## API

```js
import { createCorrectionJournal, createCorrectionRecord, deriveLearningHints } from "../src/index.js";

const journal = createCorrectionJournal({ storage: localStorage });
journal.append(
  createCorrectionRecord({
    engine: "retime-lrc",
    form: "timed",
    predictedTime: 12.42,
    correctedTime: 12.58,
  }),
);
const hints = journal.hints({ minimumSamples: 5, maxOffsetSeconds: 0.75 });
```

Records are bounded, schema-versioned, serializable, and safe to delete. A
hint is eligible only after the configured minimum number of corrections for
that engine. The default offset clamp is ±750 ms.

## Applying hints

Hints are not global configuration. A caller explicitly supplies them:

```js
synchronize({
  engine: "auto-form",
  lyrics,
  duration,
  parameters: { profiles, learningHints: hints },
});
```

The router adjusts candidate starts by the matching engine offset, fuses the
candidates, and enforces monotonic line order. Diagnostics include the engines
for which hints were applied. If no hint is supplied, behavior is unchanged.

## Privacy and limitations

There is no upload path, no external model, and no language-dependent training.
The journal learns a systematic timing bias, not vocal identity or lyric
semantics. A correction journal must never be treated as a ground-truth corpus
until the user has independently listened and verified every corrected line.
