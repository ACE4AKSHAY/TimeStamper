# Lyrics-to-audio alignment research

Research date: 2026-11-13  
Scope: offline-first, known lyrics, line-level LRC first, word/phoneme timing
later, no mandatory AI/ML model, no mandatory dataset, and no license decision
made for this repository.

This is an engineering literature review for LyricSync. The links and
recommendations are inputs to experiments, not claims that a paper, model or
external project has been copied into this repository.

## Executive conclusion

The problem is technically solvable, but it is not one problem and there is no
single universal aligner. The research literature repeatedly separates these
cases:

1. **Already-timed lyrics, same or similar recording:** estimate a global shift
   and local drift, then snap cautiously to vocal/onset evidence.
2. **Plain lyrics and a song:** infer a monotonic segmentation of the audio and
   assign lyric lines to segments. This is weaker without phonetic evidence and
   must expose uncertainty.
3. **Known lyrics plus a different recording:** use a verified reference
   recording, acoustic templates and constrained DTW.
4. **Word/phoneme timing in a dense mix:** isolate vocals if possible, then use
   a singing-adapted phoneme/CTC forced aligner. This has the highest potential
   precision in the reviewed literature, but introduces models, language
   resources, compute and licensing questions. This is a research conclusion,
   not a measured LyricSync result.

The recommended LyricSync engine is a **cascade and fusion system**:

```text
input classification
  -> timed-LRC retiming OR plain-lyrics segmentation OR reference DTW
  -> optional vocal evidence / optional phoneme aligner
  -> robust monotonic fusion
  -> confidence, failure categories and human review
```

This matches the current project: `retime-lrc`, Boundary-DP, voicedness,
reference MFCC/DTW, the router and review diagnostics are the right foundation.
The next gains should come from better evidence and decoding constraints, not
from adding many unmeasured engines.

## 1. Formal problem statement

Let the audio waveform be (x[n]), sampled at (f_s), and let the supplied
lyrics be an ordered sequence of units (L=(\ell_1,\ldots,\ell_N)). A unit can
be a line, phrase, word, syllable or phoneme. The output is a pair of times for
each unit:

$$
  B_i=(s_i,e_i), \quad 0\le s_i\le e_i\le T,
$$

where (T) is the recording duration. At minimum we require monotonic starts:

$$
  s_1\le s_2\le\cdots\le s_N.
$$

The observed audio does not say which lyric generated each frame. It contains
instrumental accompaniment, drums, backing vocals, reverberation, breaths,
ad-libs, repeated choruses and possible edits. The real problem is therefore
latent-variable inference:

$$
  \hat B=\arg\min_B\; D(F(x),B,L)+\lambda_{order}R_{order}(B)
       +\lambda_{gap}R_{gap}(B)+\lambda_{text}R_{text}(B),
$$

where (F(x)) is one or more audio feature streams, (D) measures how well
each proposed segment explains the audio, (R_{order}) enforces monotonicity,
and the gap/text terms model intros, silence and weak duration priors.

The correct granularity matters. A line-level LRC timestamp usually means “the
line begins here,” while a karaoke renderer may require word or syllable onset
and offset. A method that is good for line starts can still be poor for word
boundaries.

### 1.1 Feature evidence

| Symbol | Evidence | Strength | Typical failure |
| --- | --- | --- | --- |
| (E_t) | RMS/log energy | Cheap coarse activity | Drums and accompaniment create false peaks. |
| (O_t) | spectral-flux/onset strength | Locates attacks and consonant transitions | Sustained vowels have weak onsets; drums dominate. |
| (V_t) | vocal/voicedness probability | Suppresses purely instrumental regions | Heuristic pitch can confuse instruments and harmony. |
| (P_t) | F0/pitch salience | Useful for sung notes and sustained vowels | Polyphony, vibrato and breath make F0 unreliable. |
| (M_t) | MFCC/log-mel embedding | Good for audio-to-audio similarity | Does not know which lyric is being sung. |
| (C_t) | chroma/HPCP | Robust to timbre and some instrumentation | Describes harmony, not words. |
| (Q_t) | phonetic posterior/CTC emissions | Direct text-to-audio evidence | Requires a language/model resource; speech models can fail on singing. |

Keep these streams separate. Normalization and fusion must be explicit so an
experiment can show which stream helped.

### 1.2 Three decoding families

**Boundary dynamic programming.** If lines are ordered but not acoustically
labelled, define a cost for assigning line (i) to frames (k{:}j):

$$
C_i(k,j)=w_E C_E+w_O C_O+w_V C_V+w_P C_P
         +\lambda_d\phi(j-k,\ell_i)+\lambda_g G(k,j).
$$

Then solve (D(i,j)=\min_{k<j}\{D(i-1,k)+C_i(k,j)\}). This is the
mathematical core of the current Boundary-DP family. It is language-neutral
when $\phi$ uses Unicode/grapheme length only, but it cannot prove that the
singer said a particular word.

**DTW / constrained DTW.** For two feature sequences (A_{1:n}) and
(B_{1:m}), the standard recurrence is:

$$
D(i,j)=d(A_i,B_j)+\min(D(i-1,j),D(i,j-1),D(i-1,j-1)).
$$

A Sakoe–Chiba band or slope constraint prevents impossible time warps. A
coarse-to-fine path first finds a broad alignment and then refines it at high
resolution. This is appropriate for a verified reference recording, not for
mapping arbitrary text to audio by itself.

**HMM/Viterbi or CTC forced alignment.** Text is converted to states (usually
phonemes or characters), audio produces per-frame likelihoods, and Viterbi
finds the most likely monotonic state path. A CTC trellis is a practical modern
variant (engineering interpretation of the reviewed CTC papers, not a claim that
this repository has measured it). This directly addresses word or phoneme
timing, but requires a pronunciation representation and an acoustic model that
tolerates singing.

## 2. What the literature says

Evidence labels for this section: **published evidence** means the linked paper
or official abstract was opened and checked on 2026-11-13; **inference** is an
engineering interpretation; **own measurement** is not available yet because
this phase is research-only.

### 2.1 Classical non-neural and hybrid systems

- **LyricAlly** combines multimodal audio and text processing and reports an
  average per-line error of less than one bar on a 20-song test bed. The source
  page explicitly describes rhythm structure, singing-voice detection and
  chorus detection. **Published evidence; verified 2026-11-13.**
  [LyricAlly paper page](https://www.comp.nus.edu.sg/~kanmy/wing/publication/10-1109-tasl-2007-911559/)
- **Mesaros and Virtanen (DAFx 2008)** use voice separation, a speech HMM
  adapted to singing, a phoneme/pause/instrumental-break language model and
  Viterbi decoding. Their abstract reports 1.40 seconds mean absolute line
  error on 17 commercial recordings. **Published evidence; verified
  2026-11-13.**
  [Automatic alignment of music audio and lyrics](https://homepages.tuni.fi/annamaria.mesaros/pubs/autalign_cr.pdf)
- **Segmentation-based lyrics/audio alignment (ISMIR 2008)** first segments the
  audio, labels similar segments, and then applies dynamic programming between
  segments and lyric paragraphs. **Published evidence; verified 2026-11-13.**
  [ISMIR 2008 paper](https://ismir2008.ismir.net/papers/ISMIR2008_126.pdf)
- **Fujihara and Goto (2012)** provide a survey chapter on lyrics-to-audio
  alignment and its applications. **Published evidence; verified 2026-11-13.**
  Specific MFCC/HMM/Viterbi details should be checked against the PDF before
  being treated as a quotation from that chapter.
  [Lyrics-to-Audio Alignment and its Application](https://drops.dagstuhl.de/entities/document/10.4230/DFU.Vol3.11041.23)

### 2.2 Non-ASR acoustic correspondence

- **Unsupervised repetitive vowel acoustics (2017)** avoids a pre-trained ASR
  model by discovering repeated vowel patterns and using Canonical Time
  Warping (CTW). This is relevant when long vowels are more stable than
  consonants and a singer differs from speech-model training data.
  [Paper](https://arxiv.org/abs/1701.06078)
- **Word-level synchronization using separated vocals** is retained as a lead
  for a modular “vocal preparation -> acoustic alignment” path. The IEEE record
  was blocked during this audit, so the specific method and result are **not
  verified in this phase**.
  [IEEE paper record](https://ieeexplore.ieee.org/abstract/document/7952235)

### 2.3 Multilingual and modern learned systems

- **Multilingual lyrics-to-audio alignment (ISMIR 2020)** evaluates character
  and phoneme representations across languages. A language-independent front
  end is possible, but a universal phoneme route and training data still matter
  for high precision.
  [Paper PDF](https://program.ismir2020.net/static/final_papers/101.pdf)
- **Phoneme-level lyrics alignment and text-informed separation (2021)** is
  retained as a frontier lead for combining separation and alignment. The IEEE
  record returned an access error during this audit, so the detailed method and
  result are **not verified in this phase**.
  [IEEE paper record](https://ieeexplore.ieee.org/abstract/document/9463691)
- **Improving lyrics alignment through joint pitch detection (2022)** argues
  that pitch is useful because musical note timing can be more precise than
  weak lyric boundaries. This supports adding pitch as a boundary prior.
  [Paper](https://arxiv.org/abs/2202.01646)
- **Contrastive audio-to-lyrics alignment for multiple languages (2023)** learns
  audio/text embeddings and can use weak annotations. It is a credible future
  model plug-in, but conflicts with the current no-mandatory-model product
  constraint.
  [Paper](https://arxiv.org/abs/2306.07744) · [Spotify research summary](https://research.atspotify.com/publications/contrastive-learning-based-audio-to-lyrics-alignment-for-multiple-languages)
- **Real-time lyrics alignment using chroma and phonetic features (ICASSP
  2024)** combines melodic/chroma evidence with phonetic posteriorgrams for
  live classical singing. This is a useful future streaming design.
  [Paper page](https://pure.kaist.ac.kr/en/publications/a-real-time-lyrics-alignment-system-using-chroma-and-phonetic-fea/)
- **Frame-wise phoneme labels with masked cross-entropy (DAFx 2025)** is a
  current frontier direction: learn frame-level phoneme evidence and decode it
  with singing-aware constraints.
  [DAFx 2025 paper](https://dafx25.dii.univpm.it/wp-content/uploads/2025/09/DAFx25_paper_15.pdf)
- **AMNLT (2024)** broadens the problem to aligned music notation and lyrics
  transcription. It matters if LyricSync later incorporates melody/score or
  note-level karaoke data.
  [Paper](https://arxiv.org/abs/2412.04217)

### 2.4 Adjacent frontier: audio-to-audio vocal alignment

Rys Up Audio's open benchmark is not text-to-audio lyrics alignment. It aligns
backing/double vocals to a guide vocal and includes exact synthetic truth plus
real vocal takes. It is useful for testing whether learned or self-supervised
audio embeddings help the reference-recording branch, but it must not be
reported as lyric-alignment accuracy.

[RysUp Align benchmark](https://github.com/rysupaudio-lab/rysupalign-bench) ·
[RysUpAlign product context](https://rysupaudio.com/products/rysupalign)

## 3. Open-source tools and how they fit

The linked official documentation or repository page for each row was opened
on 2026-11-13. “Use in LyricSync” and “Main risk” are engineering inferences;
they are not claims that the dependency has been adopted.

| Tool/project | What it provides | Use in LyricSync | Main risk |
| --- | --- | --- | --- |
| [librosa DTW](https://librosa.org/doc/latest/_modules/librosa/sequence.html) | Python STFT/chroma/MFCC and DTW references | Reproduce experiments and compare our JS math | Python dependency and numerical conventions. |
| [Sync Toolbox](https://groupmm.github.io/synctoolbox/build/html/index.html) | Multiscale DTW, memory-restricted DTW and high-resolution synchronization | Port algorithmic ideas to the reference branch | Designed for audio-to-audio, not text semantics. |
| [Essentia](https://essentia.upf.edu/documentation.html) | C++/Python/JS audio/MIR descriptors: onset, pitch, HPCP/chroma | Optional feature adapter or offline oracle | Official documentation states Affero GPLv3 and a proprietary license is available on request; no dependency decision made. |
| [aubio](https://aubio.org/documentation) | Lightweight onset, pitch and beat extraction | Compare CPU onset/voicedness profiles | Native build/runtime packaging. |
| [Sonic Visualiser](https://www.sonicvisualiser.org/) + [MATCH Vamp](https://vamp-plugins.org/download.html) | Human annotation, visual inspection and audio timeline alignment | External ground-truth review and reference experiments | External desktop tool, not Electron core. |
| [Demucs](https://github.com/facebookresearch/demucs) | Vocal/drum/bass/other source separation | Optional local vocal stem before phonetic alignment | Repository code is MIT, but the repository is archived/not actively maintained and model/data terms still need a separate audit. |
| [Open-Unmix](https://github.com/sigsep/open-unmix-pytorch) | Reference source-separation implementation | Independent separation baseline | Repository states MIT; PyTorch/model/runtime and model-data terms still need a separate audit. |
| [WhisperX](https://github.com/m-bain/whisperX) | ASR plus VAD and phoneme forced alignment | Optional transcript/phoneme plugin | Speech-trained models can fail on singing. |
| [Torchaudio FABundle](https://docs.pytorch.org/audio/stable/tutorials/forced_alignment_tutorial.html) | CTC forced-alignment API and pretrained speech bundles | Reference implementation for a CTC plugin | The current tutorial warns that the API is deprecated during TorchAudio's maintenance transition; Torch runtime and model/singing mismatch remain risks. |
| [Montreal Forced Aligner](https://montreal-forced-aligner.readthedocs.io/en/latest/user_guide/index.html) | Kaldi-based trainable text/speech forced alignment | Speech-like vocal and pronunciation experiments | Dictionaries and speech assumptions. |
| [Gentle](https://github.com/strob/gentle) | Lenient Kaldi forced aligner | Spoken/rap-like baseline | Older speech resources, weaker singing support. |
| [AutoLyrixAlign](https://github.com/chitralekha18/AutoLyrixAlign) | Pretrained polyphonic lyrics aligner | Optional external comparison | Model/data compatibility and language coverage. |
| [Lyrics-to-Audio-Alignment](https://github.com/rupakvignesh/Lyrics-to-Audio-Alignment) | Structural segmentation plus HMM/Viterbi | Study a classical explainable pipeline | Old dependencies and monophonic assumption. |
| [lyric-align](https://github.com/ijuinryukichi/lyric-align) | CJK-first local forced-alignment workflow | Study Japanese/CJK normalization and review | ASR/model stack, not a JS library. |
| [mir_eval alignment](https://mir-eval.readthedocs.io/latest/api/alignment.html) | AAE, median error, PCS and PCO metrics | Match published/MIREX evaluation | Python definitions must be ported carefully if needed. |

This is a research map, not an adoption list. Any dependency requires an
isolated adapter, runtime measurement and license/model audit first.

## 4. Datasets and evaluation resources

The linked dataset or project pages were opened on 2026-11-13. Dataset sizes,
language labels and access statements below are source facts; the recommended
use and privacy guidance are engineering decisions for this repository.

The user’s private, manually reviewed songs are valuable product evidence, but
they should remain private. Public resources are useful for reproducibility only
after checking access and terms:

| Resource | What it contains | Best use | Caveat |
| --- | --- | --- | --- |
| [JamendoLyrics](https://github.com/f90/jamendolyrics) | 80 songs in different genres/languages with word-level start/end and line-level annotations | Multilingual word-level benchmark | The repository README says the GitHub copy is deprecated, moved to Hugging Face, and should no longer be updated; check current access/terms. |
| [DALI](https://zenodo.org/records/1492443) | 5,358 audio tracks with time-aligned vocal melody notes and lyrics at four granularities | Large-scale lyrics/notes research | The record describes teacher-student automatic creation and web-retrieved audio; access and downstream terms must be checked. |
| [MIR-MLPop](https://github.com/york135/MIRMLPop) | Time-aligned multilingual pop annotations for Mandarin, Taiwanese Hokkien and Cantonese; the repository includes code to obtain audio | Cross-language evaluation | The README says non-commercial use only and audio access may require an academic-use request. |
| [MIR-1K](https://zenodo.org/records/3532216) | 1,000 short clips from 110 Chinese karaoke songs with separate channels, lyrics, pitch/unvoiced labels and speech recordings | Separation and singing/non-singing comparisons | Restricted Zenodo record; Chinese karaoke domain, not a general commercial-song benchmark. |
| [MUSDB18](https://sigsep.github.io/datasets/musdb.html) | 150 tracks with vocals/drums/bass/other stems | Separation quality and vocal-stem ablations | Separation benchmark, not lyric ground truth. |
| [MIREX ALA](https://music-ir.org/mirex/wiki/2024%3ALyrics-to-Audio_Alignment) | Intended source for task format, submissions and metrics | Compare with published alignment systems | The page returned a 502 during this audit, so its current details are not verified. |
| [MIREX evaluation repo](https://github.com/ismir-mirex/mirex-evaluation) | Open evaluation pipelines | Reproduce metrics and output formats | Python tooling and task conventions. |

Recommended evaluation hierarchy:

1. Unit tests and deterministic synthetic fixtures for mathematical correctness.
2. A private, manually verified set covering actual target languages and
   recording types.
3. A public benchmark subset for comparison with literature.
4. Held-out alternate recordings for the reference/DTW branch.

### Metrics to implement consistently

- **AAE/MAE:** mean/median absolute boundary error in seconds or milliseconds.
- **PCO:** percentage of correct onsets within a tolerance window.
- **PCS:** percentage of correctly aligned segment duration.
- **Coverage:** fraction of lyric units with a valid timestamp.
- **Review precision/recall:** whether low-confidence flags identify bad lines.
- **Runtime and memory:** wall time, real-time factor, peak memory and UI cost.

[`mir_eval.alignment`](https://mir-eval.readthedocs.io/latest/api/alignment.html)
documents common absolute-error and percentage-based metrics. Use the same
tolerance definitions when comparing results.

## 12. Verified research package

The detailed, phase-gated artifacts are kept separate so each decision can be
reviewed and reverted independently:

- [Literature matrix](../research/literature-matrix.md): one row per work,
  evidence status, metrics and comparability notes.
- [Tools matrix](../research/tools-matrix.md): candidate tools, licenses,
  models, runtime and Electron integration risks.
- [Candidate engines](../research/candidate-engines.md): replacement pipelines
  with published expectation and an intentionally empty measured column.
- [Dataset review](../research/datasets.md): size, languages, annotation
  granularity, access terms and private-data boundary.
- [Evaluation protocol](../research/evaluation-protocol.md): formulas,
  tolerances, abstention, runtime, statistics and split rules.
- [Annotation guide](../research/annotation-guide.md): line-start policy,
  difficult cases and the double-annotation human noise floor.
- [Failure taxonomy](../research/failure-taxonomy.md): mathematical cause,
  detector and repair/flag/abstain behavior.
- [Experiment plan](../research/experiment-plan.md): E-1 through E9,
  pre-registered thresholds and replacement rule.
- [Decision memo](alignment-decision-memo.md): concise recommendation and open
  questions.
- [Link audit](../research/link-audit.md) and [corrections log](../research/corrections.md):
  Phase 1 source verification.
- [Dependency-free link checker](../research/scripts/link-checker.mjs) and
  [verified-case schema](../research/schemas/verified-case.schema.json):
  optional Phase 7 research tooling.

No document above contains a measured real-song result yet. Published evidence,
engineering inference and future own measurements must remain clearly separated.

## 5. Divide-and-conquer problem map

Each row should be a separately testable module and experiment. Do not make one
large “super-aligner” until ablations show that a combination helps.

| Subproblem | Mathematical question | Candidate methods | Current status | Next experiment |
| --- | --- | --- | --- | --- |
| A. Input identity | Is this the intended recording? | Metadata, duration, version markers, hashes | Matching/review queues exist | Add mismatch diagnostics to every run. |
| B. Audio preflight | Is there enough signal/vocal activity? | RMS, flux, pitch confidence, vocalness, silence ratio | Energy/flux/voicedness exist | Calibrate abstention thresholds. |
| C. Onset evidence | Where could a line begin? | Flux, energy derivative, vocal envelope, peak picking | Several profiles exist | Compare onset detectors and local peak candidates. |
| D. Structure | Which repeated section is this? | Self-similarity, novelty, repetition/chorus retrieval | Repeated-line checks exist | Add section anchors and duplicate-chorus disambiguation. |
| E. Text units | What should be aligned? | Lines, words, graphemes, phonemes, syllables | Unicode lines/word interpolation exist | Add optional phoneme-unit contract. |
| F. Plain-text timing | How do ordered lines partition time? | Boundary-DP, HMM/Viterbi, duration priors, gaps | Boundary-DP family exists | Add explicit gap/intro state and robust priors. |
| G. Timed-LRC correction | How do we transfer known timing? | Robust affine (t'=at+b), local snap, monotonic clamp | `retime-lrc` exists | Evaluate piecewise drift and confidence. |
| H. Reference recording | How does a cover deform time? | MFCC/log-mel/chroma DTW, multiscale/banded DTW | MFCC/constrained DTW exists | Port coarse-to-fine paths on alternate recordings. |
| I. Phonetic evidence | When does a known unit occur? | CTC trellis, HMM/Viterbi, PPG | CTC contract exists | Optional local model plugin with manifests. |
| J. Vocal separation | Does a vocal stem improve evidence? | Demucs, Open-Unmix, text-informed separation | Adapter contract exists | Full-mix vs stem ablation. |
| K. Fusion | Which hypothesis should win? | Median/weighted median, Huber loss, abstention | Consensus/review flags exist | Calibrate confidence against verified lines. |
| L. Human correction | Can edits improve future runs locally? | Bounded bias estimates, per-engine priors | Numeric journal exists | Held-out correction experiments. |
| M. Evaluation | Is “better” real? | AAE, PCO, PCS, bootstrap intervals, strata | Synthetic evaluator exists | Add private real-case runner. |

## 6. Recommended mathematical engine

### Stage 0: normalize and classify

1. Normalize Unicode to NFC but preserve display text.
2. Keep line order and IDs; never silently delete lyric lines.
3. Detect absent, line-timed or word-timed input.
4. Detect likely instrumental/low-vocal input as a review/refusal signal, not a
   claim about language or song identity.

### Stage 1: independent profiles

Extract normalized (E,O,V,P), and optionally (C,M). Keep original profiles
and extraction configuration in diagnostics. A first fusion is:

$$
S_t=\alpha E_t+\beta O_t+\gamma V_t+\delta P_t,
\quad \alpha+\beta+\gamma+\delta=1.
$$

Weights must be tuned by ablation, not intuition. Use robust percentile
normalization so one loud chorus does not dominate the recording.

### Stage 2A: timed-LRC input

Use a robust affine model against candidate vocal/onset evidence:

$$
\hat t_i=a r_i+b, \quad a\in[a_{min},a_{max}],
$$

where (r_i) is the imported reference start. Estimate (a,b) with bounded
search or robust regression, discard impossible matches, snap only when local
evidence improves beyond a threshold, then enforce monotonicity. Allow a
piecewise model only when evidence supports a real tempo/edit change; otherwise
it overfits.

### Stage 2B: plain lyrics

Use Boundary-DP with an explicit gap/intro state. Combine vocal-gated onset
evidence, energy/flux boundaries, a weak grapheme-duration prior, pause/silence
penalties and optional repeated-section constraints. This is a globally
constrained segmentation hypothesis, not word recognition. If the profile is
flat or likely instrumental, abstain and keep timestamps empty.

### Stage 2C: verified reference recording

Extract reference and target features, normalize consistently, find a coarse
multiscale DTW path, refine in a narrow high-resolution band, and map reference
lyric boundaries through the path. Use chroma/HPCP for harmonic stability and
MFCC/log-mel or self-supervised embeddings for timbral detail. Report local
cost/margin diagnostics.

### Stage 3: optional phonetic plugin

If a local CTC/phoneme model and language resource are verified, run it on the
full mix and/or vocal stem. Constrain the path to lyric order and retain
unknown/ad-lib gaps. Treat model output as one candidate, not unquestionable
truth. WhisperX, torchaudio FABundles, MFA and singing-specific models belong
here, outside the offline core.

### Stage 4: robust fusion and abstention

For each line, collect starts from successful candidates. Use a median or
clustered median, not an unbounded average. Flag disagreement, weak local cost
margin, low vocal evidence or unmatched lines. Apply a monotonic clamp only as
a safety repair and report that it happened.

## 7. What should and should not be combined

### Good combinations

- Existing LRC + robust affine drift + local onset/vocal snap.
- Energy + spectral flux + voicedness + pause-aware Boundary-DP.
- Reference MFCC/log-mel DTW + chroma path for alternate mixes.
- Vocal separation + phonetic/CTC candidate + full-mix fallback.
- Repeated lyric/section anchors + global monotonic DP.
- Multiple candidates + disagreement-based review instead of silent voting.

### Combinations to avoid initially

- Raw chroma alone for lyric boundaries: it tracks harmony, not words.
- Beat grid alone: singing can start off-beat and lines can span bars.
- Averaging every engine equally: one failed candidate can move a good result.
- Treating Whisper/ASR timestamps as ground truth: singing, reverb and language
  mismatch violate speech assumptions.
- Mandatory vocal separation: artifacts can remove consonants or backing vocals.
- Training or tuning on generated timestamps: this creates circular evidence.

## 8. Ordered experiment program

Each experiment must have its own configuration, output and short report. Keep
negative candidates; do not delete them merely because they lose.

1. **E0 — timing parser/retimer:** pure shift, affine drift, local snap and
   adversarial repeated lines.
2. **E1 — onset ablation:** energy vs flux vs vocal-gated flux vs combined score.
3. **E2 — boundary DP:** add gap state, duration prior and pause penalty one at
   a time; report AAE/PCO/coverage.
4. **E3 — structure:** repeat/chorus anchors and self-similarity; test duplicate
   chorus matches.
5. **E4 — reference DTW:** MFCC, log-mel, chroma and multiscale/banded paths on
   alternate recordings with independently verified starts.
6. **E5 — separation:** full mix vs vocal stem vs residual; measure timing and
   computational cost.
7. **E6 — phonetic plugin:** CTC/HMM candidate on languages with resources;
   report language-specific failures separately.
8. **E7 — fusion:** robust median, weighted median and abstention; calibrate
   confidence on held-out songs.
9. **E8 — correction journal:** train hints on one subset and evaluate on
   different songs/recordings; prevent cross-track leakage.
10. **E9 — stress/generalization:** intro, outro, instrumental break, chorus,
    ad-lib, rap, melisma, backing vocals, cover, live, remix and low-quality
    audio.

Minimum real-case strata: five ordinary vocal songs, two languages, one long
intro, one instrumental-heavy song, one cover/live or alternate mix, one
slowed/remix case and one song with repeated choruses. Keep the user’s verified
cases private unless redistribution rights are clear.

## 9. Replacement decision rule

The current DSP/DP engine is **not protected from replacement**. A candidate
replaces the current default only if it wins on held-out verified cases and
meets product constraints:

| Gate | Required evidence |
| --- | --- |
| Accuracy | Lower line/word AAE and better PCO/PCS than the current route, with confidence intervals. |
| Robustness | No unacceptable regressions on instrumentals, intros, repeated choruses, melisma, backing vocals or alternate versions. |
| Coverage | Works for the target language/script strata or abstains clearly. |
| Runtime | Fits the offline CPU/RAM budget and does not freeze the UI. |
| Reproducibility | Pinned model/features, deterministic config and repeatable output. |
| Privacy | Local execution remains possible; no cloud upload is required. |
| Legal/maintenance | Code, model and data terms are recorded before integration. |

If a phoneme/CTC system wins, it becomes the recommended engine and the current
DSP/DP path remains a transparent fallback. If it only wins on one language or
recording type, route by form/language/resource availability. If no candidate
clearly wins, keep the current explainable route and improve its evidence.

## 10. Practical recommendation for LyricSync now

**Implement next without a model:**

1. Add a real onset detector and log-mel/chroma options behind the existing
   profile contract.
2. Add a gap-aware, text-duration Boundary-DP with explicit abstention.
3. Upgrade reference DTW to coarse-to-fine multiscale/banded alignment.
4. Add repeated-section anchors and phrase-level confidence diagnostics.
5. Match MIREX/mir_eval definitions and add stratified real-case reports.

**Keep optional and isolated:**

- Demucs/Open-Unmix separation;
- CTC/phoneme alignment;
- WhisperX/MFA/Gentle adapters;
- Essentia/aubio/librosa/Sonic Visualiser interoperability;
- contrastive or other learned audio-text models.

**Do not add yet:** a mandatory model download, cloud API, automatic lyric
rewriting or broad dependency stack before DSP/DP/DTW ablations are measured.
The current offline JavaScript core is valuable as a transparent baseline and
fallback when a model fails.

## 11. Source and licensing notes

The links point to papers, official project pages, official repositories or
dataset cards. They are research references, not permission to copy code or
ship weights. Before integrating anything, record its code license, model
license, dataset terms, patents/usage restrictions, runtime size, platform
support and redistribution permission. The LyricSync repository remains
unlicensed by maintainer decision; this document does not change that decision.
