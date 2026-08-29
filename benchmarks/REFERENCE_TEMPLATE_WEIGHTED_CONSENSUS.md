# Experiment 31 — confidence-weighted reference-template consensus

## Purpose

The reference-template ensemble previously gave every candidate equal weight.
This experiment adds an opt-in weighted median, using each candidate's bounded
line confidence as influence. A candidate with a weak acoustic match can then
contribute less to the consensus timestamp.

## Implementation

- `src/consensus-aligner.js` adds `summarizeWeightedConsensus`.
- `src/reference-template-ensemble.js` exposes it with
  `ensembleOptions.weightByConfidence: true`.
- The default remains the unweighted median.

The result also reports total weight and candidate count. Confidence remains a
review-prioritization signal, not a calibrated probability; correlated
candidate errors can still produce a confidently wrong consensus.

## Validation

The deterministic reference-template fixture tests verify weighted and
unweighted paths, monotonic output, finite timestamps, and the public engine
contract. No production threshold or default change was made. Independent
reference/target recordings are required to determine whether confidence
weighting helps real covers, live versions, remixes, or instrumental variants.

