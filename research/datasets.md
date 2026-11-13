# Dataset and access review

Audit date: 2026-11-13. No dataset, audio or model was downloaded. The tables
record only what the official page exposed during this audit.

Evidence labels:

- **Published evidence** is copied/paraphrased from the linked official page.
- **Inference** is a proposed LyricSync use.
- **UNVERIFIED** means the official page did not expose the requested detail or
  access/license terms require a separate agreement.

## Public resources

| Resource | Size and languages | Annotation granularity / creation | Audio and licenses | Access method | Known quality issues | LyricSync forms |
| --- | --- | --- | --- | --- | --- | --- |
| JamendoLyrics MultiLang | 80 songs; different genres and languages; exact per-language counts not stated on the README | Word start/end and line annotations; README describes word-by-word annotations and line files derived from them; manual/automatic provenance beyond the README is **UNVERIFIED** | Audio and annotation license/terms **UNVERIFIED** from the README; do not assume commercial reuse | GitHub README says the old repository is preserved and the latest version moved to Hugging Face | README says old copy is deprecated and line annotations are generated from word annotations; annotation errors are possible | Best public word/line ALA benchmark; not a Telugu/Hindi benchmark. Source: [README](https://raw.githubusercontent.com/f90/jamendolyrics/master/README.md), accessed 2026-11-13. |
| Jam-ALT / Jam-ALT Lines | Revision of JamendoLyrics; website identifies four language subsets through the dataset links; exact current item count is **UNVERIFIED** on the landing page | Readability-aware text with punctuation, line breaks, spelling, background vocals and non-word sounds; line-level timings are available, but website explicitly says it is not word-aligned | Dataset page is hosted on Hugging Face; exact audio/annotation license **UNVERIFIED** | Hugging Face `datasets` dataset and separate line-level dataset; no download performed | Website warns it is for ALT, not word-level ALA; formatting revisions can differ from original lyric text | Excellent text-normalization and mismatch benchmark; line-level only for ALA. Sources: [Jam-ALT site](https://audioshake.github.io/jam-alt/) and [ISMIR paper](https://arxiv.org/abs/2311.13987), accessed 2026-11-13. |
| DALI | 5,358 audio tracks; language breakdown **UNVERIFIED** | Time-aligned lyrics and vocal melody notes at four granularities; teacher-student automatic creation from draft karaoke annotations and web-retrieved audio | Zenodo record provides paper, not a blanket audio redistribution license; access/downstream terms **UNVERIFIED** | Zenodo record and external audio links described by the paper | Automatically created alignment can contain matching and timing errors; not treated as perfect ground truth | Large-scale line/word/note research; useful for learned/reference comparison if terms permit. Source: [Zenodo record](https://zenodo.org/records/1492443), accessed 2026-11-13. |
| MIR-MLPop | Three documented subsets: Mandarin, Taiwanese Hokkien and Cantonese; repository provides 20 training songs and 10 test songs per README | Time-aligned lyrics and audio annotations; pronunciation variants and fused syllables are explicitly documented; annotation process is curated/reviewed but exact annotator protocol **UNVERIFIED** | README says non-commercial use only; audio may require an academic-use request; annotation/code license details **UNVERIFIED** | GitHub code/annotations and an audio download script; no download performed | README documents filler/speech fade-out ambiguity and pronunciation/fusion cases | Cross-language line/word evaluation for Chinese varieties; not Indic. Source: [official README](https://raw.githubusercontent.com/york135/MIRMLPop/main/README.md), accessed 2026-11-13. |
| MIR-1K | 1,000 clips from 110 Chinese karaoke songs; 4–13 seconds per clip, 133 minutes total | Separate singing/accompaniment channels, lyrics, pitch contours, unvoiced labels, vocal/non-vocal segments and speech recordings; manual labels stated | Zenodo record is restricted; exact license/access terms must be accepted by the dataset owner | Zenodo access request and legacy download links; no download performed | Short clips and karaoke domain; not representative of commercial full-song mixes | Separation, voicedness and short alignment tests; weak for long-form LRC. Source: [Zenodo](https://zenodo.org/records/3532216), accessed 2026-11-13. |
| MUSDB18 | 150 full-length tracks, approximately 10 hours; 100 train / 50 test | Isolated drums, bass, vocals and other stems; no lyric ground truth | Hosted by SigSep/Zenodo with academic-use request; track licenses vary by source and are listed by the official page | Request access through SigSep; no download performed | Separation benchmark, not lyric timing; source-specific rights | Full-mix versus vocal-stem separation ablation, not direct lyric scoring. Source: [SigSep page](https://sigsep.github.io/datasets/musdb.html), accessed 2026-11-13. |
| MUSDB-ALT | Long-form transcripts following Jam-ALT guidelines for MUSDB18 test tracks; exact count **UNVERIFIED** in abstract | Line-level timings and public vocal stems are stated by the 2025 paper | Audio/annotation terms **UNVERIFIED**; inherit MUSDB18 constraints unless official dataset page says otherwise | Hugging Face dataset link from the paper; no download performed | Test-set scope and long-form transcript choices need exact dataset-card review | Strong candidate for separation + transcription diagnostics; not a substitute for word-level ALA. Source: [paper](https://arxiv.org/abs/2506.15514), accessed 2026-11-13. |
| RWC Popular Music / Jamendo SVD resources | Public SVD literature uses these resources; exact current counts/licenses **UNVERIFIED** in this audit | Vocal activity labels or derivable vocal/non-vocal labels in cited SVD literature | Access and licenses vary; no download performed | Official dataset pages must be checked before use | SVD labels do not equal lyric onset ground truth; genre and annotation definitions differ | SVD calibration only. Source lead: [SVD survey](https://www.mdpi.com/1099-4300/24/1/114), accessed 2026-11-13. |
| Annotated-VocalSet / VocalSet | Singing-voice dataset; exact size/language and current license **UNVERIFIED** from the landing page | Vocal performance and note-related annotations; not a lyric-timestamp benchmark | Access/license **UNVERIFIED** | Official paper/dataset page; no download performed | Solo-vocal domain differs from mixed pop songs | Pitch/voicedness sanity checks only. Source: [paper page](https://www.mdpi.com/2076-3417/12/18/9257), accessed 2026-11-13. |

## Minimum public comparison subset

The minimum defensible public comparison set is:

1. JamendoLyrics MultiLang for word/line ALA, using the official split and
   metric definitions.
2. Jam-ALT for text normalization, line formatting and mismatch handling, not
   as a replacement for word-level ALA.
3. MIR-MLPop’s documented test partitions for cross-script/language stress,
   subject to its non-commercial and academic-access conditions.
4. MUSDB18/MUSDB-ALT only for the full-mix versus vocal-stem ablation.

This is a recommendation (inference), not a claim that these resources are
interchangeable. DALI can be added only after its audio and annotation terms
are checked. A public benchmark result must state the exact dataset version,
split, unit, metric and license/access condition.

## What must remain private

The owner’s private songs, LRC files, manually checked timestamps, output files,
artist metadata and any local correction journal remain outside Git and outside
all online services. The project may store only hashes, abstract strata tags,
annotator IDs and derived numeric metrics if the owner explicitly chooses to
export them. Private songs are especially important for Telugu/Hindi/Indic
coverage because the public sources checked here do not establish an Indic
singing-alignment benchmark.
