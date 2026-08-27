# LyricSync v0.1

An offline-first, desktop-first foundation for the **Lightweight Offline Audio-Text Synchronization Engine and LRC Generator** project. This first milestone establishes the editable timeline and project workflow before algorithmic alignment is introduced.

## Offline-first by design

All required capabilities work with no network connection: importing audio and lyrics, waveform generation, playback, manual timing, project storage, logging and LRC export. No files are uploaded or sent to a server.

Online lyrics/LRC discovery is deliberately a future **optional connector**, not a dependency. It will be behind an explicit user action and setting, return text to the same local parser, and must fail harmlessly when offline. The reusable `OnlineLyricsProvider` boundary exists in `src/online-provider.js`; no provider or network request is enabled in v0.1.

## Included in v0.1

- Import common browser-supported audio files, view a decoded waveform, seek and play.
- Import TXT or LRC lyrics, or paste lyrics directly. UTF-8 and Unicode normalization preserve native scripts such as Telugu, Hindi, Tamil, Japanese and more; lyrics do not need a language selection to work. A one-line lyric document is also valid.
- Edit a line-level timeline: select a line and stamp either the current position or a typed time, use `T`, or adjust by a user-chosen millisecond value (100 ms by default).
- Click or drag the waveform to seek, with millisecond time feedback. Use a direct time field for exact navigation.
- General Settings provide built-in themes, waveform colour and text-size preferences, plus a discoverable shortcut list. Settings are stored locally and isolated from the synchronization engine.
- Transport includes hold-to-rewind and hold-to-fast-forward controls, a separate reset-to-start control, and a stop button that preserves the current position.
- The next research layer is available as **Initial timing**: a local RMS-energy baseline that distributes existing lyric lines through active audio. It is intentionally labelled as a low-confidence editable estimate—not lyric recognition—and should be reviewed line by line.
- Export valid centisecond LRC, including optional title, artist, album and language metadata.
- Save/reopen a human-readable `.lyricsync.json` project. Audio is deliberately only referenced by name; reselect it after reopening so the application does not copy large private media files.
- Human-readable activity log download.
- Unit tests for LRC parsing/export.

## Run as a desktop application

The project now includes an Electron desktop shell for Windows, macOS and Linux. Install the development dependency once (an internet connection is only needed for that installation), then run it locally:

```powershell
npm install
npm run desktop
```

If the global Node.js path is unavailable, use the installed NVM Node 22 runtime explicitly (the configuration currently lives at this user-local path):

```powershell
$env:Path = 'C:\Users\aksha\AppData\Local\nvm\v22.23.2;' + $env:Path
& 'C:\Users\aksha\AppData\Local\nvm\v22.23.2\npm.cmd' run desktop
```

The installed application itself loads local files only; it does not need the internet to operate. Native Save/Open dialogs are used in desktop mode.

## Run in a browser during development

Node.js 18 or newer is the only prerequisite.

```powershell
node scripts/serve.mjs
```

Open `http://localhost:4173` in a browser. The app is static and does not upload audio or lyrics.

Run the tests with:

```powershell
node --test
```

## Architecture

The v0.1 browser UI is a thin client over reusable ES modules:

- `src/domain.js` — lyric/project models and text normalization
- `src/lyrics.js` — TXT/LRC input normalization
- `src/lrc.js` — LRC timestamp conversion and export
- `src/storage.js` — project serialization and file downloads
- `src/logger.js` — human-readable project logger
- `src/app.js` — UI, playback, waveform visualization and manual editor
- `desktop/` — minimal secure Electron shell; the renderer has no Node.js access
- `src/online-provider.js` — optional online-search contract, intentionally unused by core functionality
- `src/engine.js` — platform-neutral `synchronize()` entry point for reusable alignment engines
- `src/project-store.mjs` — structured local project directory storage for desktop/CLI workflows
- `src/metrics.js` and `scripts/run-benchmark.mjs` — accuracy and resource measurement for experiments

The next phase should extract the existing modules into a platform-neutral engine package, then add a measurable RMS/energy baseline. That core can be reused by a future mobile client or a native frontend on another operating system. Vocal separation, MFCC/DTW, forced alignment, and automatic timestamping are intentionally deferred until their hypotheses and benchmarks are ready.

## Constraints

Audio decoding/playback depends on the browser's codec support. MP3, WAV, OGG and M4A/AAC generally work in current desktop browsers; FLAC/OPUS support varies. In the later desktop/Python implementation, FFmpeg should provide the required format normalization.
