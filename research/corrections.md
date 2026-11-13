# Phase 1 corrections and verification notes

Audit date: 2026-11-13  
Scope: factual statements in sections 2–4 of
`docs/lyrics-alignment-research.md`.  
Evidence rule: a statement is marked **verified** only when the linked paper,
official abstract, documentation page or repository README was opened during
this phase. A blocked page is retained as a lead, not treated as evidence.

## Corrections applied

1. **LyricAlly result — verified and made precise.** The source reports an
   average error of less than one bar for per-line alignment on a 20-song test
   bed. The draft now says “average per-line error” and links the source.

2. **Mesaros and Virtanen — expanded from a vague summary.** The paper’s
   abstract explicitly describes voice separation, a singing-adapted HMM,
   phoneme/pause/instrumental-break language modeling and Viterbi decoding. It
   also reports 1.40 seconds mean absolute line error on 17 commercial
   recordings. The draft now records those details and the access date.

3. **ISMIR 2008 segmentation paper — narrowed to the abstract.** The original
   wording asserted vocal/non-vocal evidence without a line-level citation.
   It now states only the verified structural segmentation, similar-segment
   labels and dynamic-programming alignment between audio segments and lyric
   paragraphs.

4. **Fujihara and Goto survey — claim scope reduced.** The page and metadata
   were verified, but the detailed PDF was not used to substantiate every MFCC,
   HMM and Viterbi detail. Those details are now flagged for PDF-level checking
   instead of being presented as verified quotations.

5. **IEEE record 7952235 — blocked.** The audit browser returned an internal
   access error. The former specific description of synthesized speech plus
   DTW is now marked as an unverified lead, and the URL/status appears in
   `research/link-audit.md`.

6. **IEEE record 9463691 — blocked.** The audit browser returned HTTP 418. The
   former detailed method claim is now marked as an unverified lead.

7. **Essentia license — verified and qualified.** Official documentation states
   Affero GPLv3 and says a proprietary license is available on request. The
   tools table now records both facts instead of presenting AGPLv3 as the only
   possible licensing route.

8. **Demucs — maintenance and license clarified.** The official repository
   identifies MIT code and says the repository is archived/not actively
   maintained. Model and training-data terms remain a separate audit item.

9. **Open-Unmix — license clarified.** The official repository states MIT. The
   table still keeps model/runtime and model-data review as separate risks.

10. **TorchAudio forced-alignment tutorial — lifecycle warning added.** The
    current official tutorial warns that its APIs are deprecated during the
    TorchAudio maintenance transition. The draft now records that compatibility
    risk.

11. **JamendoLyrics — repository state corrected.** The README verifies 80
    songs with word-level start/end and line-level annotations. It also says the
    GitHub copy is deprecated, moved to Hugging Face and should no longer be
    updated. The dataset row now reflects both facts.

12. **DALI — size and provenance corrected.** Zenodo verifies 5,358 audio
    tracks, time-aligned vocal melody notes and lyrics at four granularities,
    with a teacher-student automatic creation process and web-retrieved audio.
    The row now uses this exact description and avoids treating it as manually
    perfect ground truth.

13. **MIR-MLPop — language and access details verified.** The repository README
    lists Mandarin, Taiwanese Hokkien and Cantonese, says the contents are not
    for commercial use, and describes academic-use audio access. The row now
    records those constraints.

14. **MIR-1K — dataset description made exact.** Zenodo verifies 1,000 clips
    from 110 Chinese karaoke songs, separate accompaniment/singing channels,
    lyrics, pitch and unvoiced labels, and speech recordings. The row now
    avoids implying that it is a general commercial-song benchmark.

15. **MUSDB18 — source checked.** The SigSep page verifies 150 full-length
    tracks, isolated drums/bass/vocals/other stems, 100 train and 50 test
    tracks, and academic-use access conditions. The row remains a separation
    benchmark, not a lyric-ground-truth benchmark.

16. **MIREX ALA — blocked.** The 2024 wiki URL returned HTTP 502 during the
    audit. Its row now says it is an intended task-format source whose current
    details are unverified.

17. **Evaluation metrics — source checked.** The `mir_eval.alignment` page
    verifies median/average absolute error, percentage-correct timestamps and
    percentage-correct segments. The draft keeps these metric names and links
    the official API page.

## Non-factual engineering language

The executive conclusion now says that phoneme/CTC alignment has the “highest
potential precision in the reviewed literature,” not that it is proven best for
LyricSync. This is an inference from the reviewed literature. The CTC-trellis
sentence is also explicitly labeled an engineering interpretation. No
LyricSync accuracy claim is made: own measurements remain pending and no audio,
dataset or model was downloaded in Phase 1.
