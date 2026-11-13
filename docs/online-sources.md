# Online lyric sources and matching

LyricSync treats online lookup as an optional convenience layer. The editor,
alignment engine and LRC export continue to work without network access.

## What was incorporated from the LastWave discussion

The useful architectural ideas were reproduced independently rather than copied
from the GPL-licensed LastWave source:

- several source classes can be queried concurrently;
- every result is normalized to one internal provider-neutral shape;
- word-timed results rank above line-timed results, which rank above plain text;
- artist, title, duration and recording-version clues affect ranking;
- provider failures are isolated and slow requests can be cancelled;
- source identity and match reasoning are visible before import;
- unsupported sites remain manual browser links instead of being scraped.

This is deliberately not a streaming player, account system, downloader, EQ,
social feature, or cloud library. Those features do not improve timestamp
alignment and would make the project heavier.

## Module map

| Module | Responsibility |
| --- | --- |
| `src/online/online-provider.js` | LRCLIB, lyrics.ovh and safe manual search-link providers; common result normalization. |
| `src/online/lyric-normalizer.js` | Parses line-timed and enhanced/word-timed LRC into `timedLines` and `timedWords`. |
| `src/online/lyric-matcher.js` | Scores exact metadata, timing level, duration and version markers such as live, remix, piano or instrumental. |
| `src/online/online-search.js` | Concurrent provider fan-out, per-provider cache reuse, failure isolation and ranked output. |
| `src/online/online-cache.js` | Seven-day local cache; no audio or project data is sent. |
| `src/ui/app.js` | Opt-in search UI, ranked result display, import/copy actions and provenance recording. |
| `src/domain.js` | Project provenance and the per-track lyric offset field. |
| `src/lrc.js` | Applies the non-destructive offset when exporting LRC. |

## Result shape

Providers are normalized to fields including:

```text
title, artist, album, duration
plainLyrics, syncedLyrics
timedLines, timedWords
providerId, providerName, sourceUrl
timingLevel, score, matchReason
```

The current editor is line-oriented. Word timing is retained in the normalized
online result so a future karaoke or mobile client can use it; it is not yet
rendered as word-by-word highlighting.

## Recording-version safety

Names containing `Live`, `Remix`, `Instrumental`, `Piano`, `Karaoke`, `Cover`,
`Acoustic`, `Slowed`, `Reverb`, or `Demo` are treated as clues, not proof. A
result with a conflicting version receives a lower score and the user still
must review it. An instrumental file is not considered matched merely because
the title is identical.

## Offset behavior

The **Lyric offset** field is measured in milliseconds. It changes the displayed
line positions and exported LRC timestamps without changing the imported source
line values. This is useful when a provider's timing is globally early or late.
It is not a substitute for line-by-line correction or a recording mismatch.

## Legal and reliability boundary

Only the public adapters currently implemented are automatic. Browser links
for Genius, Musixmatch, Lyrics.com, Better Lyrics, Apple Music and YouTube are
provided for user inspection and copy/paste. LyricSync does not bypass access
controls, scrape private endpoints, or copy LastWave code. Online results are
convenience candidates, not ground truth; review them before export.
