# Experiment 32 — clustered reference-template consensus

## Purpose

If deterministic variants disagree by a large amount, a plain median can fall
between two competing timing hypotheses. The clustered consensus option first
groups starts within a configured time tolerance, selects the highest-weight
cluster, then calculates the weighted median within that cluster.

## Implementation

- `src/consensus-aligner.js` adds `summarizeClusteredConsensus`.
- `src/reference-template-ensemble.js` exposes it through
  `ensembleOptions.clusterToleranceSeconds`.
- The selected cluster, outlier count, total candidate count, and tolerance are
  returned for review.

When `weightByConfidence` is enabled, cluster weight uses candidate confidence;
otherwise every candidate has equal weight. A line with outliers receives the
`cluster_outliers` review category unless an even lower confidence category
already applies. The default tolerance is zero, preserving ordinary median
consensus.

## Validation and limits

Deterministic tests verify that a close pair at 1.00/1.04 seconds is selected
over a 2.00-second outlier and that the public ensemble path remains monotonic.
This does not establish accuracy: candidate variants can share the same wrong
acoustic hypothesis. Independent alternate recordings are still required.

