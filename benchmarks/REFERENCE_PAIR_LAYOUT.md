# Alternate-recording pair layout

Use this private layout when a cover, live take, remix, alternate mix, or
slowed version is available:

```text
reference-template-pairs/
  song-name/
    reference.mp3          # reviewed source/reference recording
    target.mp3             # alternate recording to align
    lyrics.lrc             # same lyric rows, UTF-8
    reference.json         # verified: true + reference startTimes
    target-reference.json  # verified: true + independently checked target startTimes
```

The two JSON timestamp arrays must match the lyric line count and be checked
against their own audio files. A downloaded LRC may help begin the review, but
it must not be copied into either JSON without listening verification. Keep all
audio, lyrics and JSON outside Git; the evaluator writes only metadata and
metrics to `benchmarks/private/`.

The `reference` recording supplies acoustic MFCC templates. The `target`
recording is the held-out test. A vocal-separated file can be used as the
target in a separate comparison, but it is a preprocessing variant rather than
an independent recording.
