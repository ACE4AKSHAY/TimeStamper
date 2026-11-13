# Contributing to LyricSync

## Development setup

Use Node 22 (NVM is supported) and install the lockfile dependencies:

```powershell
npm ci
```

Before committing, run:

```powershell
npm test
npm run lint
npm run check-compatibility
npm run check-runtime
```

## Project boundaries

- Keep offline editing and synchronization independent of online providers.
- Do not commit audio, lyrics, caches, logs, generated benchmark results, or
  files under `benchmarks/private/`.
- Keep experimental engines isolated and document their evidence limits.
- Do not claim real-song accuracy without independently verified timestamps.
- Prefer small commits with tests and documentation updated together.

## Pull requests

Describe the behavior changed, tests run, runtime used, and any remaining
manual verification. If a change affects algorithm output, include the engine
name and fixture or private-evaluation procedure used to measure it.
