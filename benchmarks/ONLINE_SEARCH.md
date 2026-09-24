# Optional online lyrics search

## User workflow

1. Work offline normally: import audio, paste/import TXT or LRC, edit the
   timeline, and export. No online code is needed for this path.
2. If a source lyric file is missing, open Settings and enable **optional
   online lyrics search**.
3. Enter `Artist - Song title` when possible and choose a result. Timed LRC
   text is imported as timestamped lines; plain text is imported as editable
   untimed lines and can also be copied directly to the clipboard.
4. Review the imported text and timestamps before export. The service result is
   a convenience source, not ground truth.

The Settings dialog also exposes individual source switches. The main online
search switch must be enabled first; disabling a source prevents requests to
that source while leaving the others available.

## Privacy and failure behavior

- The default is disabled and remains offline-first.
- When enabled, only the typed title/artist query is sent to the selected
  public providers. Audio,
  waveform data, project files, and local lyrics are never uploaded.
- Offline mode, blocked requests, empty results, and HTTP errors produce a
  visible warning while leaving the local project unchanged.
- Automatic providers: LRCLIB for timed/plain results and lyrics.ovh for plain
  lyrics. Search-link results open Genius, Musixmatch, or Lyrics.com for the
  user to inspect and copy manually; the app does not scrape those sites.
- Network requests have a bounded timeout and accept cancellation from the
  **Cancel search** button. A failed provider does not stop the other selected
  sources.
- Successful responses are cached locally for seven days per provider and
  artist/title context. Use **Clear cached online results** in Settings to
  remove them; the cache contains no audio or waveform data.
- When a result is imported, the project records its provider, result type,
  source URL, query context, and retrieval time beside the lyric source.
- The provider registry is isolated in `src/online/online-provider.js`; replacing a
  source or adding another service does not change parsing, editing, alignment,
  or LRC export.

## Verification

`test/online-provider.test.mjs` uses an injected fake transport, so provider
normalization and failure handling are tested without network access.
