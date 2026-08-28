# Private real-case evaluation harness

This harness is the bridge from synthetic experiments to measured songs. It
expects a private directory containing one subdirectory per manually verified
case:

```text
verified-cases/
  song-01/
    audio.mp3       # or WAV/M4A/FLAC/etc.; not copied
    lyrics.lrc      # or lyrics.txt; not copied
    reference.json  # manually verified line starts
```

`reference.json` must include `verified: true` and one of `startTimes`,
`lineStarts`, `timestamps`, or `lines: [{"startTime": ...}]`. Starts must be
finite, non-negative, monotonic, and match the lyric line count. Unverified or
malformed cases are skipped or reported as failures instead of entering the
accuracy aggregate.

The command decodes locally, extracts RMS/spectral-flux/pitch profiles, runs
the selectable engines, and writes only paths, generated timestamps, metrics,
decoder metadata, and failure reasons. Audio bytes and lyric text never enter
the output or Git.

```powershell
$env:Path = 'C:\Users\aksha\AppData\Local\nvm\v22.23.2;' + $env:Path
npm run evaluate-real -- 'C:\path\to\verified-cases'
```

To run a subset of engines, pass a comma-separated fourth argument after the
output path, for example `adaptive-boundary-dp,refined-boundary-dp`.
Compressed files require local FFmpeg; WAV/PCM uses the built-in decoder.
