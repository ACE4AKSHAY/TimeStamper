# Run configuration records

Local alignment and private real-case evaluation outputs now include a
`runConfiguration` object. It records the workflow, selected engine(s), decoder
format/sample rate/duration, exact profile and pitch extraction settings, and
the feature-cache identity/key.

The record is deliberately separate from generated timestamps and runtime
measurements. That makes it useful for comparing experiments: two outputs with
the same configuration used the same algorithm settings, while different
configuration records explain why their results should not be compared as if
they were identical runs.

`src/run-config.mjs` owns the schema and keeps it platform-neutral. The local
alignment and real-case scripts construct it only after feature extraction has
resolved its defaults, so omitted command-line options are still recorded with
their effective values. No source audio, decoded PCM, or lyric text is added to
the configuration.
