# LyricSync

LyricSync is an offline-first Electron desktop tool for aligning lyric lines to
local audio and exporting editable LRC files. It works without internet, AI
models, cloud accounts, or a dataset; online lyric lookup is optional.

> Screenshot placeholder: add a product screenshot here after the next manual
> UI review.

The GitHub repository is currently named `TimeStamper`; the application and
documentation use **LyricSync**.

## Install and run

Node 22 is recommended. If you use NVM, activate Node 22 using your own local
NVM command; no user-specific path is required by this repository.

```powershell
npm ci
npm run desktop
```

Browser development mode:

```powershell
npm start
```

Run the verification suite:

```powershell
npm test
npm run smoke-test
npm run check-runtime
npm run check-compatibility
```

## Typical usage

1. Choose an audio file.
2. Import an LRC/TXT file or paste lyrics.
3. Use manual stamping, Initial timing, Automatic timing, or verified-reference alignment.
4. Review the editable timeline.
5. Export an LRC file.

```text
audio + lyrics → local feature extraction → editable line timeline → LRC
```

## Features

- Offline audio playback, waveform seeking and exact millisecond navigation.
- TXT/LRC import with Unicode and native-script preservation.
- Manual timestamping, ordering validation, insert/duplicate/delete controls.
- Explainable energy, spectral, voicedness, Boundary-DP and MFCC/DTW engines.
- Reference-assisted alignment for covers, live versions and alternate mixes.
- Optional online lyric providers with source controls, timeout, cache and provenance.
- Accessible keyboard waveform controls, shortcuts, themes and reduced motion.
- Human-readable project files and LRC export.

## Documentation

- [Architecture and recreation guide](docs/architecture.md)
- [Implementation plan and acceptance checks](docs/roadmap.md)
- [Offline setup](docs/offline-setup.md)
- [MFCC/DTW detailed notes](docs/mfcc-dtw.md)
- [Online search behavior](benchmarks/ONLINE_SEARCH.md)
- [Real-data evaluation](benchmarks/REAL_DATA_EVALUATION.md)
- [Project status and requirements traceability](PROJECT_STATUS.md)
- [Internal learning and manual-review notes](docs/internal/)

## Development principles

- The offline engine never imports Electron, Node-only APIs, or online services.
- Experimental algorithms stay isolated so they can be compared and retained.
- Real-song accuracy is reported only from verified recordings; synthetic tests
  validate code behavior but do not prove song accuracy.
- Audio, lyrics, caches, logs and private evaluation outputs stay outside Git.

## License

The license is intentionally undecided. A license will be added after the
maintainer confirms the preferred option.
