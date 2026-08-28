# Real-song file requirements

This checklist is for a future private evaluation set. The application can
edit any local song and lyric text without a dataset; these requirements apply
only when we want to measure alignment accuracy.

## Audio files

| Requirement | Preferred choice | Notes |
| --- | --- | --- |
| Recording | Complete vocal recording | Keep the full intro/outro; do not trim unless you record the trim. |
| Version | The exact recording represented by the lyrics | Avoid accidental cover, remix, live, karaoke, piano, BGM, ringtone, or instrumental mismatches. |
| Format | PCM WAV, 16-bit, mono or stereo | WAV works in the Node pipeline without extra software. |
| Other formats | MP3, M4A/AAC, FLAC, OGG | The desktop player may play these, but automated Node extraction currently needs local FFmpeg for compressed formats. |
| Protection | DRM-free and readable locally | Do not use files that require a streaming login or cannot be decoded offline. |
| Rights | Personal or redistribution-cleared | Keep copyrighted media private; never commit it to GitHub. |

WAV is the safest handoff format. A 44.1 kHz or 48 kHz source is fine; the
pipeline resamples/normalizes only at the decoder boundary when needed.

## Lyrics files

| Requirement | Preferred choice | Notes |
| --- | --- | --- |
| Encoding | UTF-8 | Telugu, Hindi, Tamil, Malayalam, Kannada, Bengali, Japanese, Arabic, and other scripts are supported. Do not transliterate unless that is the actual lyric text. |
| Format | Plain `.txt` or `.lrc` | LRC timestamps are useful starting hints. They are not automatically ground truth. |
| Structure | One lyric line per row, in singing order | Keep repeated lines if they are sung repeatedly. Remove unrelated translations, comments, and websites' boilerplate. |
| Content | Lyrics for the same language/version as the audio | A translation can be stored separately, but it should not be paired as the primary lyrics timeline. |
| Timestamps | Any existing line timestamps are welcome | Missing timestamps are acceptable for manual editing, but a verified reference timeline is needed for accuracy scoring. |

There is no requirement for the lyrics to contain English text. The alignment
engine uses audio features for timing; language affects text handling and review,
not the numeric audio alignment features.

## Pairing rules

Use matching stems where possible, for example:

```text
audio/Artist - Song.wav
lyrics/Artist - Song.lrc
```

The names do not have to match exactly, but each pair must represent the same
recording. LRCGet downloads can be used as an initial source, then checked for
version and line ordering.

## Recommended first batch

Start with 5–10 clear vocal tracks, not the whole collection. A useful batch
contains a mixture of languages and ordinary studio recordings, while marking
special versions separately. For each selected pair, eventually record:

- `audioMatchesLyrics`: true/false;
- `isVocalRecording`: true/false;
- `timestampsVerified`: true/false;
- corrected line-start times in seconds;
- correction count and notes about intros, ad-libs, overlaps, noise, or unusual timing.

Only rows with all three Boolean values true and a corrected timestamp array
belong in the accuracy benchmark. Instrumental or uncertain rows can remain in
a separate failure-analysis set.

## Suggested private layout

```text
dataset_private/
  audio/       # local audio; never committed
  lyrics/      # UTF-8 TXT/LRC; never committed
  metadata/    # optional language/version notes; never committed
```

The repository's preparation tools store only metadata and absolute local
paths under `benchmarks/private/`, which is ignored by Git. No internet
connection is required at runtime.
