# Reference-template ensemble

## Purpose

Different deterministic template configurations can disagree at difficult
onsets, pauses, or chorus overlaps. The ensemble layer runs those candidates,
selects the median start time for each line, and reports spread and median
absolute deviation as review signals.

## Code

- `src/reference-template-ensemble.js` runs named reference-template variants
  and builds the consensus timeline.
- `src/engine.js` exposes it as the opt-in
  `engine: "reference-template-ensemble"` path.
- `src/consensus-aligner.js` supplies the language-neutral median and
  disagreement calculation.

Every candidate remains in the returned result, so users can inspect which
configurations agreed. Low agreement or excessive spread marks the line for
review. The layer does not recognize language and does not claim that a
consensus is correct: correlated MFCC errors can still produce the same wrong
answer.

## Example configuration

```js
{
  engine: "reference-template-ensemble",
  parameters: {
    referenceSamples,
    referenceSampleRate,
    referenceStarts,
    referenceDuration,
    targetSamples,
    targetSampleRate,
    targetDuration,
    variants: [
      { name: "anchored", options: { useReferenceAnchors: true } },
      { name: "anchor-free", options: { useReferenceAnchors: false } },
      { name: "refined", options: { templateBoundaryRadius: 1 } }
    ]
  }
}
```

This is an API/fixture validation milestone only. Independent reference and
target recordings are still required before confidence thresholds or variant
selection can be promoted into the desktop workflow.

