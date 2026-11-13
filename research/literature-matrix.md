# Literature matrix

Audit date: 2026-11-13  
Scope: literature and publicly documented systems relevant to known-lyrics
alignment, lyrics transcription, singing activity, source separation,
audio-to-audio synchronization, structure, pitch and low-resource languages.

Evidence labels used in this document:

- **Published evidence**: the linked primary paper, official abstract or
  official project page was opened on the audit date.
- **Inference**: a proposed LyricSync interpretation, not a published result.
- **Own measurement**: none; no real LyricSync dataset was run in this phase.
- **UNVERIFIED**: the accessible source did not expose the requested detail or
  the page could not be opened. It must not be treated as a result.

## 1. Lyrics-to-audio alignment

| Work | Venue/year; URL | Task and input | Method summary | Data and reported metric (primary-source location) | Public code/model and licenses | Language / singing evidence | Relevance to LyricSync |
| --- | --- | --- | --- | --- | --- | --- | --- |
| LyricAlly (Kan, Wang, Iskandar, New, Shenoy) | TASLP paper page, 2008; [NUS page](https://www.comp.nus.edu.sg/~kanmy/wing/publication/10-1109-tasl-2007-911559/) (accessed 2026-11-13) | Textual lyrics + polyphonic acoustic music; line synchronization | Multimodal audio/text processing with rhythm structure, singing-voice detection, chorus detection and lyric-length estimates | 20 CD recordings; average per-line error under one bar (**Abstract**, source page) | Code/model license and model size: **UNVERIFIED** from the page | Singing and polyphonic music are explicit in the abstract; language coverage **UNVERIFIED** | Historical precedent for an explainable cascade and repeated-section handling. |
| Automatic Alignment of Music Audio and Lyrics (Mesaros, Virtanen) | DAFx 2008; [PDF](https://homepages.tuni.fi/annamaria.mesaros/pubs/autalign_cr.pdf) (accessed 2026-11-13) | Textual lyrics + polyphonic singing audio; line timing | Voice separation, singing-adapted speech HMM, phoneme/pause/instrumental-break language model and Viterbi | 17 commercial recordings; mean absolute line error 1.40 s (**Abstract**, PDF p. 1) | Code/model license, weight size and release status: **UNVERIFIED** | Singing voice is explicit; language set **UNVERIFIED** | Strong classical phonetic baseline, but depends on singing adaptation and separation. |
| Segmentation-Based Lyrics-Audio Alignment (Lee, Cremer) | ISMIR 2008; [PDF](https://ismir2008.ismir.net/papers/ISMIR2008_126.pdf) (accessed 2026-11-13) | Audio + hand-labelled lyric paragraphs; segment synchronization | Structural segmentation, similar-segment labels and dynamic programming between audio segments and lyric paragraphs | Abstract says it performs well for varied musical audio; numerical table/figure result **UNVERIFIED** from the accessible abstract | Code/model license and model size: **UNVERIFIED** | Musical audio is explicit; language and singing-data composition **UNVERIFIED** | Supports a structure-first line/paragraph stage before finer timing. |
| Lyrics-to-Audio Alignment and its Application (Fujihara, Goto) | Dagstuhl Follow-Ups, 2012; [publisher page](https://drops.dagstuhl.de/entities/document/10.4230/DFU.Vol3.11041.23) (accessed 2026-11-13) | Survey/chapter covering singing audio and lyrics alignment | Survey of alignment formulations and applications | No new benchmark metric in the page metadata; **UNVERIFIED** without the full PDF | Chapter page states CC BY 3.0; code/model not applicable | Singing voices and lyrics are explicit; language coverage **UNVERIFIED** | Terminology and taxonomy source, not a directly comparable experiment. |
| Lyrics-to-Audio Alignment by Unsupervised Discovery of Repetitive Patterns in Vowel Acoustics (Chang, Lee) | IEEE Access, 2017; [arXiv](https://arxiv.org/abs/1701.06078) (accessed 2026-11-13) | Lyrics + music audio, including singer variation | WS-NMF vowel-pattern subspace followed by canonical time warping; unsupervised singing separation is used before alignment | Korean and English experiments; abstract says more promising than listed baselines, but no number is exposed in the abstract (**Abstract**) | Code/model release and licenses: **UNVERIFIED** | Singing-specific vowel acoustics; Korean/English in abstract | Candidate for language-light acoustic correspondence, especially after vocal preparation. |
| End-to-end Lyrics Alignment for Polyphonic Music Using an Audio-to-Character Recognition Model (Stoller, Durand, Ewert) | ICASSP 2019; [arXiv](https://arxiv.org/abs/1902.06797) (accessed 2026-11-13) | Mixed polyphonic audio + known lyrics with weak line annotations | Modified Wave-U-Net predicts character probabilities directly from raw audio using learned multiscale representations | Mean alignment error 0.35 s on a standard dataset (**Abstract**; dataset identity and table number are **UNVERIFIED** from the abstract) | Public code/model and licenses: **UNVERIFIED** from the arXiv page | Singing/polyphonic audio explicit; language coverage **UNVERIFIED** | Important evidence that end-to-end text-aware alignment can work with line-level supervision. |
| Multilingual Lyrics-to-Audio Alignment (Vaglio et al.) | ISMIR 2020; [paper PDF](https://program.ismir2020.net/static/final_papers/101.pdf) (accessed 2026-11-13) | Lyrics + audio across multiple languages | RNN trained with CTC; compares character and phoneme intermediate representations and universal phonemes | Multiple-language evaluation with varying resources; no numeric metric copied because the abstract does not expose a table/figure (**Abstract**) | Public release and licenses: **UNVERIFIED** | Multiple languages and zero-resource setting are explicit; singing task is explicit | Direct evidence for multilingual phoneme/character routes, but not evidence for Indic languages specifically. |
| Improving Lyrics Alignment through Joint Pitch Detection (Huang, Benetos, Ewert) | ICASSP 2022; [arXiv](https://arxiv.org/abs/2202.01646) (accessed 2026-11-13) | Lyrics + singing audio; forced alignment | Multi-task alignment model incorporating pitch and boundary detection | Abstract reports improved accuracy and fewer cross-line errors; exact values/table **UNVERIFIED** from abstract | Public code/model and licenses: **UNVERIFIED** | Singing-specific pitch relation is explicit; languages **UNVERIFIED** | Justifies a pitch-assisted boundary candidate stream. |
| Contrastive Learning-Based Audio to Lyrics Alignment for Multiple Languages (Durand, Stoller, Ewert) | ICASSP 2023; [arXiv](https://arxiv.org/abs/2306.07744) and [Spotify summary](https://research.atspotify.com/publications/contrastive-learning-based-audio-to-lyrics-alignment-for-multiple-languages) (accessed 2026-11-13) | Audio + lyrics, multilingual word alignment | Cross-modal contrastive embeddings instead of CTC; uses weak annotations | Average absolute error below 0.2 s on the standard Jamendo dataset (**Abstract**; exact table/variant **UNVERIFIED** from abstract) | Released word alignments are stated; training code/model license and weight size **UNVERIFIED** | Robust to other languages when trained on English is stated; singing task is explicit | Strong learned candidate, but it conflicts with the no-mandatory-model product constraint until measured locally. |
| Real-Time Lyrics Alignment Using Chroma and Phonetic Features (Park, Yong, Kwon, Nam) | Conference contribution, page accessed 2026-11-13; [KAIST page](https://pure.kaist.ac.kr/en/publications/a-real-time-lyrics-alignment-system-using-chroma-and-phonetic-fea/) | Live singing + known lyrics, online timing | Combines chromagram and phonetic posteriorgram under low-latency constraints | Recast Schubert Winterreise Dataset is stated; numeric results **UNVERIFIED** from the accessible abstract | Code/model licenses and model size: **UNVERIFIED** | Classical vocal performance; language coverage **UNVERIFIED** | Relevant only as a future streaming/online variant, not the offline default. |
| Improving Lyrics-to-Audio Alignment Using Frame-wise Phoneme Labels (Cheng, Nakano, Goto) | DAFx 2025; [PDF](https://dafx25.dii.univpm.it/wp-content/uploads/2025/09/DAFx25_paper_15.pdf) (accessed 2026-11-13) | Lyrics + audio with word annotations; phoneme timing | Masked frame-wise cross-entropy on partially derived phoneme labels, with CTC/reconstruction baseline | MAE 0.216 s and median absolute error 0.041 s on Jamendo test set (**Abstract**, PDF p. 1) | Code/model/weight license and size: **UNVERIFIED** | Singing lyrics task; language coverage **UNVERIFIED** | A modern phoneme candidate and a concrete target for an isolated experiment. |

## 2. Lyrics transcription and benchmark practice

| Work | Venue/year; URL | Task and input | Method/data summary | Reported metric (primary-source location) | Public assets/licenses | Relevance |
| --- | --- | --- | --- | --- | --- | --- |
| Jam-ALT: A Formatting-Aware Lyrics Transcription Benchmark (Cífka et al.) | arXiv 2023; [arXiv](https://arxiv.org/abs/2311.13987) (accessed 2026-11-13) | Automatic lyrics transcription from music audio | Revises JamendoLyrics with an annotation guide covering punctuation, line breaks, spelling, background vocals and non-word sounds; adds formatting-aware metrics | No number copied from abstract; exact benchmark tables **UNVERIFIED** | Dataset/code links are public from the paper page; dataset/code/model licenses **UNVERIFIED** | Supplies normalization and text-mismatch rules even though it is not word-level alignment ground truth. |
| Lyrics Transcription for Humans: A Readability-Aware Benchmark (Cífka et al.) | ISMIR 2024; [arXiv](https://arxiv.org/abs/2408.06370) (accessed 2026-11-13) | Human-readable lyrics transcription | Full JamendoLyrics revision and lyric-specific evaluation metrics | No number copied from abstract; tables **UNVERIFIED** | CC license link is exposed by arXiv; exact dataset/code/model terms **UNVERIFIED** | Provides the project’s formatting and background-vocal annotation vocabulary. |
| Exploiting Music Source Separation for Automatic Lyrics Transcription with Whisper (Syed et al.) | ICME AI for Music Workshop 2025; [arXiv](https://arxiv.org/abs/2506.15514) (accessed 2026-11-13) | Whisper ALT on original audio, separated vocals and stems | Compares separation conditions; uses separation as a vocal-activity boundary signal for long-form transcription | Abstract reports consistent WER reduction and state-of-the-art open-source results on Jam-ALT; exact values/table **UNVERIFIED** | MUSDB-ALT is released; code/model/data licenses and sizes **UNVERIFIED** | Directly motivates the full-mix versus vocal-stem ablation. |

## 3. Singing voice/activity detection

| Work | URL and date | Input/task | Method/data/metric evidence | Assets/licenses | Relevance |
| --- | --- | --- | --- | --- | --- |
| Singing Voice Detection: A Survey | [MDPI survey](https://www.mdpi.com/1099-4300/24/1/114) (accessed 2026-11-13) | Frame/segment classification of singing versus non-singing | Survey describes voiced, unvoiced and silent portions and reviews classical and neural approaches; individual benchmark numbers are not copied because the survey page is not a primary experiment for each number | No single code/model license; **UNVERIFIED** | Published evidence supports SVD as a preprocessing signal; LyricSync should treat it as evidence, not text recognition. |
| Research on Singing Voice Detection Based on an LRCN with Vocal Separation and Temporal Smoothing | [MDPI paper](https://www.mdpi.com/2079-9292/9/9/1458) (accessed 2026-11-13) | Singing activity in mixed music | LRCN with separation and temporal smoothing; compares common public datasets | Numeric scores and table references **UNVERIFIED** from the accessible landing page | Code/model/data licenses **UNVERIFIED** | Singing detection is explicit; genres/languages depend on datasets | Candidate source for a future SVD oracle, but not a dependency decision. |

## 4. Vocal separation and its effect on alignment/transcription

| Work/tool | URL and date | Task/input | Evidence and reported metric | License/model status | Relevance |
| --- | --- | --- | --- | --- | --- |
| Hybrid Spectrogram and Waveform Source Separation (Demucs) | [official repository](https://github.com/facebookresearch/demucs) (accessed 2026-11-13) | Mixed music -> vocals/drums/bass/other | Repository describes the separation task and reports SDR values for MUSDB HQ in its README; exact comparison context should be checked before reuse | Repository states MIT code; repository is archived/not actively maintained; model/data terms **UNVERIFIED** | Optional vocal preprocessor only; separation artifacts must be measured. |
| Open-Unmix for PyTorch | [official repository](https://github.com/sigsep/open-unmix-pytorch) (accessed 2026-11-13) | Mixed music -> source stems | Repository describes four stems and MUSDB18 pretraining; alignment-specific metric **UNVERIFIED** | Repository states MIT; weights/model-data terms **UNVERIFIED** | Independent separation baseline for the ablation, not an alignment engine. |
| Exploiting Music Source Separation for ALT (Syed et al.) | [arXiv](https://arxiv.org/abs/2506.15514) (accessed 2026-11-13) | Whisper transcription with full mix, separated vocals and stems | Abstract states consistent WER reductions and vocal-activity boundary use; exact WER numbers/table **UNVERIFIED** | MUSDB-ALT release stated; licenses/sizes **UNVERIFIED** | Closest public evidence for testing whether separation helps a text-aware system. |

## 5. Audio-to-audio alignment

| Work/tool | URL and date | Task/input | Method and metrics | Assets/licenses | Relevance |
| --- | --- | --- | --- | --- | --- |
| Sync Toolbox (Müller et al.) | [official documentation](https://groupmm.github.io/synctoolbox/build/html/index.html) (accessed 2026-11-13) | Audio-to-audio synchronization | Multiscale DTW, memory-restricted multiscale DTW and high-resolution synchronization; no benchmark number copied from the documentation landing page | Open-source package license and model terms **UNVERIFIED** | Reference algorithm design for the alternate-recording branch. |
| librosa sequence DTW/Viterbi | [official source documentation](https://librosa.org/doc/latest/_modules/librosa/sequence.html) (accessed 2026-11-13) | Feature sequence alignment | Official source exposes DTW, backtracking, Viterbi and Sakoe–Chiba constraints; no published benchmark metric on this page | Package license/model terms **UNVERIFIED** | Numerical reference for validating the local JS implementation. |
| RysUp Align benchmark | [benchmark repository](https://github.com/rysupaudio-lab/rysupalign-bench) (accessed 2026-11-13) | Audio-to-audio vocal take alignment | Repository title describes exact synthetic truth and real vocal takes; it is not a lyrics benchmark and no lyric metric is claimed | Code/data/model licenses **UNVERIFIED** | Useful only for a reference-recording/audio-embedding subexperiment. |

## 6. Structure, repetition and pitch

| Work | URL and date | Evidence | Relevance |
| --- | --- | --- | --- |
| LyricAlly | [NUS page](https://www.comp.nus.edu.sg/~kanmy/wing/publication/10-1109-tasl-2007-911559/) (accessed 2026-11-13) | Source page explicitly describes detected hierarchical rhythm structure and chorus detection; metric is in the alignment row above | Supports section anchors and repeated-chorus disambiguation before local line decoding. |
| Segmentation-Based Lyrics-Audio Alignment | [ISMIR PDF](https://ismir2008.ismir.net/papers/ISMIR2008_126.pdf) (accessed 2026-11-13) | Abstract describes structural segmentation and DP paragraph synchronization | Supports a structure-first decomposition. |
| Joint Pitch Detection | [arXiv](https://arxiv.org/abs/2202.01646) (accessed 2026-11-13) | Abstract states pitch and boundary detection improve alignment accuracy | Supports pitch as a boundary prior, subject to local measurement. |

## 7. Low-resource and Indic-language evidence

The multilingual ISMIR 2020 paper evaluates multiple languages and universal
phonemes, and MIR-MLPop publicly documents Mandarin, Taiwanese Hokkien and
Cantonese. The sources checked in this phase do **not** establish a published
benchmark for Telugu, Hindi or other Indic singing alignment. That gap is
**published-evidence gap / UNVERIFIED**, not evidence that Indic alignment is
impossible. The owner’s manually verified Indic songs are therefore important
for evaluation but must remain private unless the owner separately authorizes
sharing.

## 8. Publicly documented commercial/industry systems

| System | Public evidence checked | What can be said without speculation | LyricSync use |
| --- | --- | --- | --- |
| RysUpAlign | [product page](https://rysupaudio.com/products/rysupalign) (accessed 2026-11-13) | Public page documents a vocal timing/pitch alignment plugin and supported desktop formats; internals, training data and accuracy are **UNVERIFIED** | Context for audio-to-audio alignment only; do not treat as lyrics evidence. |
| Sonic Visualiser | [official site](https://www.sonicvisualiser.org/) (accessed 2026-11-13) | Public site documents an open-source visualisation/analysis/annotation application; plugin internals and license details beyond the site are **UNVERIFIED** | Human ground-truth annotation and inspection tool. |
| MATCH/Vamp ecosystem | [Vamp download page](https://vamp-plugins.org/download.html) (accessed 2026-11-13) | Public page documents downloadable research plugins and feature categories; no claim is made about a proprietary lyric aligner | Optional external annotation/reference workflow. |
| Synclyr / LrcSong | [Synclyr docs](https://synclyr.com/Documentation/sync-lyrics-to-audio), [LrcSong tool](https://lrcsong.com/tools/lrc/align?lang=zh-CN) (accessed 2026-11-13) | Public pages describe online lyric alignment workflows; internals, training data, exact accuracy and licenses are **UNVERIFIED** | Product comparison only; do not copy code or submit private audio/lyrics. |

## 9. Synthesis and comparability

### Evidence by input form

- **Timed LRC + same recording:** the highest-confidence low-cost case is
  retiming and local evidence checking. This is an inference from the problem
  definition and existing deterministic engine, not a published LyricSync
  measurement.
- **Plain lyrics + audio:** structure/Boundary-DP methods are explainable but
  cannot prove the sung words. Phonetic or character evidence is needed for
  word/phoneme timing. This inference rests on the HMM, CTC and structure papers
  above.
- **Known lyrics + alternate recording:** audio-to-audio DTW is directly
  applicable when a verified reference recording exists. It does not solve
  arbitrary text-to-audio alignment without a reference.
- **Dense mix + word timing:** learned CTC/character/phoneme models and vocal
  separation are the strongest published directions, but their model and
  singing-domain requirements conflict with the current lightweight offline
  constraint.

### Why published numbers cannot be ranked directly

The papers use different datasets, units (line, word, character or phoneme),
annotation quality, tolerances, recording versions and splits. A 0.35-second
mean alignment error from one standard dataset cannot be ranked against a
1.40-second mean line error from another test set, or against a median error,
without the same unit, tolerance, split and evaluation code. The only safe
comparison at this stage is within a paper’s own stated protocol. **Published
evidence and inference; no own measurement.**

### Decision implication

Do not replace the current deterministic default from literature numbers alone.
The first replacement decision must be made by the pre-registered experiments
in `research/experiment-plan.md` on verified songs, with the human noise floor
and abstention behavior included.
