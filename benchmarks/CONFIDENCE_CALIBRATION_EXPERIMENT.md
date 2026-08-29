# Confidence and failure diagnostics

## Purpose

Automatic timestamps should not all look equally trustworthy. The reference
template aligner already reports a bounded relative confidence and a
`reviewRequired` flag when a line is acoustically expensive or its boundary is
unstable. `summarizeConfidence` in `src/metrics.js` now groups scored lines
into high, medium, and low confidence buckets and reports each bucket's count,
MAE, and within-one-second rate.

This is a triage aid, not a probability model. A group can be confidently wrong
when the audio is an instrumental, the lyrics are mismatched, or two phrases
sound alike. Calibration becomes meaningful only when target timestamps are
manually verified independently of the reference recording.

## Where it is used

- `scripts/evaluate-reference-template-cases.mjs` records calibration for the
  same-recording implementation sanity check.
- `scripts/evaluate-reference-template-pairs.mjs` records calibration for
  covers, live versions, remixes, and alternate mixes once verified pairs are
  available.
- The summary is kept in generated private JSON and does not copy audio or
  lyric text.

## Decision rule

If low-confidence lines have a lower MAE than high-confidence lines, the
confidence signal is not useful for automatic review prioritization and must be
reworked. Until that comparison is measured on held-out recordings, the UI
should keep every generated timestamp editable.
