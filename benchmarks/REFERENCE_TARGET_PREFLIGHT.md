# Reference/target preflight validation

`src/reference-target-validation.js` performs cheap checks before an expensive
reference-template or vocal-separation comparison. It validates durations,
line counts, and monotonic timestamp arrays. It also reports a `review` status
when the target/reference duration ratio is outside 0.75–1.25 or a final line
touches the declared audio end.

Warnings deliberately do not reject a pair. A cover, live take, remix, or
slowed version can legitimately have a different duration; the caller can use
the opt-in `anchorScale: "duration-ratio"` mode or disable anchors and measure
the result. Invalid structure is rejected before decoding features, avoiding a
long run that could never produce a trustworthy score.

When the duration ratio is outside 0.75–1.25, the result records
`recommendedAnchorScale: "duration-ratio"`. This is a recommendation for an
explicit comparison, not an automatic parameter change.

The alternate-recording evaluator persists the preflight result beside each
case. No audio or lyric content is copied, and the check is language-neutral.
