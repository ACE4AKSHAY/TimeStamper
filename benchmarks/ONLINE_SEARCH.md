# Optional online lyrics search

## User workflow

1. Work offline normally: import audio, paste/import TXT or LRC, edit the
   timeline, and export. No online code is needed for this path.
2. If a source lyric file is missing, open Settings and enable **optional
   online lyrics search**.
3. Enter a title or artist in the lookup box and choose a result. Timed LRC
   text is imported as timestamped lines; plain text is imported as editable
   untimed lines.
4. Review the imported text and timestamps before export. The service result is
   a convenience source, not ground truth.

## Privacy and failure behavior

- The default is disabled and remains offline-first.
- When enabled, only the typed title/artist query is sent to LRCLIB. Audio,
  waveform data, project files, and local lyrics are never uploaded.
- Offline mode, blocked requests, empty results, and HTTP errors produce a
  visible warning while leaving the local project unchanged.
- The provider is isolated in `src/online-provider.js`; replacing LRCLIB or
  adding another service does not change parsing, editing, alignment, or LRC
  export.

## Verification

`test/online-provider.test.mjs` uses an injected fake transport, so provider
normalization and failure handling are tested without network access.
