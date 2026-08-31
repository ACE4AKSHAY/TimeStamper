# Cooperative alignment progress

## Purpose

Reference-template MFCC/DTW can take noticeable CPU time. A desktop UI needs
progress updates without coupling the reusable engine to Electron or a
specific renderer.

## Implementation

Pass an optional `onProgress` callback through alignment options. The callback
receives plain objects such as:

```js
{ phase: "template-dtw", completedLines: 12, totalLines: 40, fraction: 0.3 }
```

Ensembles also report variant-level progress. Observer exceptions are ignored,
so a progress display can never change alignment correctness. No callback
means no extra output or behavior change.

When using the public `synchronize()` entry point, provide `signal` and
`onProgress` inside `parameters`. They are forwarded to both the
`reference-template-mfcc-dtw` and `reference-template-ensemble` engines, so a
desktop worker, Electron IPC bridge, or future mobile adapter can use the same
contract.

## Verification

The test suite verifies progress starts, reaches fraction `1`, and remains
compatible with the portable API. This is a transport-neutral callback; future
Electron IPC or mobile progress adapters can subscribe without changing DTW.
