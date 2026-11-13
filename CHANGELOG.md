# Changelog

## Unreleased

- Added form-aware automatic timing in the desktop UI, confidence/review
  triage, missing-line filters, bounded undo/redo, and keyboard undo shortcuts.
- Added a privacy-preserving local correction journal with explicit bounded
  learning hints for router calibration; no audio, lyrics, model or network
  dependency is introduced.
- Added provider-neutral timed/word-timed result normalization, concurrent
  source search, metadata/version-aware ranking, expanded manual search links,
  and a non-destructive per-track lyric offset.
- Desktop automatic timing now supplies spectral-flux and heuristic vocalness
  profiles to the explainable route instead of relying only on RMS energy.
- Recorded the maintainer decision to keep the repository unlicensed for now.
- Repository hygiene moves user-specific paths into environment variables and
  portable commands.
- Long architecture, setup and implementation notes are grouped under `docs/`.
- Added CI, linting and formatting scaffolding without changing the offline
  engine defaults.

## 0.3.0

- Added multi-source optional online lyrics lookup, caching, cancellation and
  import provenance.
- Added the explainable automatic alignment route and accessible desktop timing
  controls.
- Added a stable platform-neutral API facade and architecture documentation.
