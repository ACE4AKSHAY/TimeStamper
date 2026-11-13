# Human annotation guide

Status: design only; no songs were annotated by this phase.  
Audit date: 2026-11-13.

## Goal and evidence labels

The goal is a reproducible reference for line starts, text mismatch and safe
abstention. The guide is an inference informed by the MIREX word-boundary
format and the user-centered evaluation work; it is not a claim about an
existing dataset’s annotation policy. Sources checked 2026-11-13:
[MIREX format](https://www.music-ir.org/mirex/wiki/2024%3ALyrics-to-Audio_Alignment)
and [user-centered evaluation](https://archives.ismir.net/ismir2021/paper/000052.pdf).

## What counts as a line start

Mark the earliest time at which the supplied lyric line becomes intentionally
audible as sung or spoken text, not the first instrumental beat and not the
start of a preceding breath. Use the same rule for every song:

- A consonant clearly belonging to the line counts even if the vowel follows
  shortly afterward.
- A pickup before the downbeat counts at the pickup’s audible lyric onset.
- If the first sound is an unvoiced consonant that cannot be located reliably,
  mark the first defensible phonetic onset and flag low confidence.
- A held vowel belongs to the line that starts it; do not move the line to a
  later pitch change.
- If the line is never sung, leave its timestamp empty and mark `not-sung`.

This is a line-level adaptation of the published onset concept; it is an
annotation rule for this project, not a published ground truth.

## Special cases

| Case | Annotation rule | Label |
| --- | --- | --- |
| Breath before a line | Do not use the breath unless it is clearly a lyric syllable; record it as a note | `breath-before` |
| Pickup | Use the actual pickup onset, even if before the bar/phrase anchor | `pickup` |
| Backing vocal | Do not change the lead-line start because of an unrelated backing phrase; if the supplied line is backing-only, annotate its own audible onset | `backing` |
| Repeated chorus | Give every occurrence a unique occurrence ID and timestamp; never match identical text by string alone | `repeat-n` |
| Ad-lib | Keep it outside the supplied line unless the source lyrics explicitly include it; record it as an extra event | `ad-lib` |
| Melisma | Start at the first sung syllable mapped to the line; do not create extra line starts for notes on the same syllable | `melisma` |
| Instrumental break | No lyric timestamp; mark the interval as an allowed gap | `instrumental-gap` |
| Sung text differs | Preserve supplied text, mark relation (`skipped`, `extra`, `repeated`, `uncertain`) and do not force a false timing | `text-mismatch` |
| Very quiet vocal | Mark the earliest defensible onset and low confidence; if not audible after review, abstain | `quiet-vocal` |

## Recommended workflow

1. Work from a verified local audio file and the exact lyric text used by the
   run. Record audio and lyric hashes, not private file paths.
2. Use Sonic Visualiser or the LyricSync editor to inspect waveform, spectrogram,
   playback and lyric rows. The external tool is only for local annotation;
   never upload private material. [Sonic Visualiser](https://www.sonicvisualiser.org/)
   was checked 2026-11-13.
3. Listen once without editing to understand the version and mark instrumental
   regions, repeats and possible text mismatches.
4. On the second pass, set line starts using the rule above. Use a consistent
   zoom/time display and avoid repeatedly dragging until the line “feels right.”
5. On the third pass, replay each line from 0.5–1.0 seconds before its start and
   confirm the onset. Record confidence (`high`, `medium`, `low`) and any special
   label.
6. Export a private verified-case record containing hashes, lyric lines, starts,
   annotator ID, strata tags and split assignment. Do not export audio or lyric
   text to Git.

## Double annotation and human noise floor

Select 3–5 songs spanning ordinary vocals, two scripts/languages and at least
one difficult stratum. Two annotators independently annotate without seeing the
other’s timestamps. After a lock period, compare matching occurrence IDs:

- compute absolute start differences per line;
- report median and 90th-percentile disagreement per song;
- list disagreements greater than 0.30 s and adjudicate them only after the
  blind comparison;
- keep both original annotations and the adjudicated reference.

The **human noise floor** is the paired disagreement distribution before
adjudication. A system improvement counts as practically meaningful only if its
paired improvement over the current default exceeds the pre-declared noise-floor
summary (primary: median disagreement) plus a small margin fixed before running
the experiment. If the two annotators cannot agree on a line’s existence or
text relation, that line is unsafe for a strict timing claim and should be
scored as an abstention/mismatch case.

## Quality-control checklist

- Audio version and lyric file are confirmed.
- All line IDs are unique and repeated occurrences are explicit.
- Starts are monotonic and within audio duration.
- No line was silently deleted.
- Instrumental, ad-lib, backing-vocal and mismatch labels are present where
  needed.
- Confidence and annotator ID are recorded.
- The annotator did not inspect a candidate engine’s prediction before the
  blind reference pass.
