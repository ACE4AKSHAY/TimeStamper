# Offline setup and runtime inventory

This file records the one-time downloads needed to develop and run TimeStamper
without continuing internet access.

## Installed on 2026-09-23

| Component | Version/path | Required after setup? |
|---|---|---|
| Node.js via NVM | `C:\Users\aksha\AppData\Local\nvm\v22.23.2\node.exe` (`v22.23.2`) | Yes |
| npm via NVM | `C:\Users\aksha\AppData\Local\nvm\v22.23.2\npm.cmd` (`10.9.8`) | Yes for scripts |
| Electron | npm dev dependency `44.4.4` | Yes for desktop app |
| FFmpeg | `C:\Users\aksha\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg.Shared_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.1-full_build-shared\bin\ffmpeg.exe` | Only for MP3/M4A/FLAC CLI alignment/evaluation |

The repository lockfile and `node_modules` contain the JavaScript runtime
package required by the app. No Python environment, ML model, dataset, cloud
account, or online service is required for offline editing, playback, manual
timestamping, waveform work, project files, or LRC export.

## Reinstall from the cached project files

Use the NVM npm path explicitly:

```powershell
$env:Path = 'C:\Users\aksha\AppData\Local\nvm\v22.23.2;' + $env:Path
& 'C:\Users\aksha\AppData\Local\nvm\v22.23.2\npm.cmd' ci --offline
```

`--offline` succeeds only while npm's cache still contains the Electron
package. If it does not, run `npm ci` once while connected; the resulting
`node_modules` can then be reused offline.

## Run without internet

```powershell
$env:Path = 'C:\Users\aksha\AppData\Local\nvm\v22.23.2;' + $env:Path
& 'C:\Users\aksha\AppData\Local\nvm\v22.23.2\npm.cmd' run desktop
```

The optional online lyrics lookup is disabled by default. The desktop app
continues to work if the machine is offline or the LRCLIB service is
unavailable. FFmpeg is used only by local compressed-audio evaluation scripts;
normal browser/Electron playback uses the local file directly.

## Verification commands

```powershell
& 'C:\Users\aksha\AppData\Local\nvm\v22.23.2\npm.cmd' test
& 'C:\Users\aksha\AppData\Local\nvm\v22.23.2\npm.cmd' run check-compatibility
& 'C:\Users\aksha\AppData\Local\nvm\v22.23.2\npm.cmd' audit --omit=dev
```

The last recorded verification passed 58 tests, reported Node `v22.23.2` as
compatible, and reported zero production vulnerabilities.
