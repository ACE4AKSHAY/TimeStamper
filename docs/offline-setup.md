# Offline setup and runtime inventory

This file records the one-time downloads needed to develop and run LyricSync
without continuing internet access.

## Installed on 2026-09-23

| Component | Version/path | Required after setup? |
|---|---|---|
| Node.js via NVM | `node` (`v22.23.2`) | Yes |
| npm via NVM | `npm` (`10.9.8`) | Yes for scripts |
| Electron | npm dev dependency `44.4.4` | Yes for desktop app |
| FFmpeg | `ffmpeg-on-PATH` | Only for MP3/M4A/FLAC CLI alignment/evaluation |

The repository lockfile and `node_modules` contain the JavaScript runtime
package required by the app. No Python environment, ML model, dataset, cloud
account, or online service is required for offline editing, playback, manual
timestamping, waveform work, project files, or LRC export.

## Reinstall from the cached project files

Activate Node 22 with your local NVM command if needed, then use npm:

```powershell
npm ci --offline
```

`--offline` succeeds only while npm's cache still contains the Electron
package. If it does not, run `npm ci` once while connected; the resulting
`node_modules` can then be reused offline.

## Run without internet

```powershell
npm run desktop
```

The optional online lyrics lookup is disabled by default. The desktop app
continues to work if the machine is offline or the LRCLIB service is
unavailable. FFmpeg is used only by local compressed-audio evaluation scripts;
normal browser/Electron playback uses the local file directly.

## Verification commands

```powershell
npm test
npm run check-compatibility
npm run check-runtime
npm audit --omit=dev
```

The verification commands report the active Node/Electron versions and the
current test count; rerun them after a dependency or runtime change.
