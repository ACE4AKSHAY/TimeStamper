# Template diagnostics refresh

## Why this step was needed

The local boundary-refinement experiment can move a split between two lyric
lines. A moved split changes the audio belonging to both lines, so the old
DTW cost, confidence, and failure category were no longer guaranteed to
describe the returned segments.

## What changed

`src/template-diagnostics.js` is a separate, reusable metadata pass. Given an
existing monotonic segmentation, it recalculates each line's DTW cost and
rebuilds boundary margins, confidence, review flags, and failure categories.
`src/reference-template-aligner.js` calls it only after the opt-in refinement;
the coarse dynamic-programming path and the default desktop workflow are
unchanged.

This pass does not select a new path. It makes diagnostics truthful for the
path already selected by the aligner and keeps the logic reusable for future
refinement methods.

## Verification

- The reference-template tests assert finite post-refinement line costs and
  failure categories.
- The complete test suite and Node compatibility check pass.
- No private audio, lyrics, or generated benchmark JSON is committed.

## Future validation

Compare confidence and review flags before and after refinement on independent
reference/target recordings. A recalculated confidence value is still a
triage signal, not a calibrated probability.

