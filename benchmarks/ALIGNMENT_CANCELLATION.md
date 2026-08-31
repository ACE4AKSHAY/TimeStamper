# Cooperative alignment cancellation

## Purpose

Reference-template MFCC/DTW alignment can be CPU-heavy, especially when an
ensemble runs multiple variants. A future Electron worker or mobile runtime
needs a way to stop work when the user cancels or starts a newer run.

## Implementation

`alignWithReferenceTemplates` and `alignLineTemplates` accept an optional
`AbortSignal` through `options.signal`. The aligner checks it before feature
search and periodically during dynamic programming, then throws an error with
`name: "AbortError"`. The ensemble checks between variants as well. Existing
calls without a signal are unchanged.

This is cooperative cancellation: JavaScript cannot safely interrupt a single
DTW calculation from outside its loop. A future worker can terminate the
worker as a hard stop, while this signal provides a clean in-process path.

## Verification

- An aborted reference-template run is covered by the test suite.
- Normal runs still pass all alignment and compatibility tests.
- No UI wiring or worker dependency was added yet; the API remains portable.

