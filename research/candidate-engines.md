# Replacement candidates

Audit date: 2026-11-13. This document defines candidates to test; it does not
claim that any candidate has been run on LyricSync data. The `Measured here`
column is intentionally empty until the evaluation protocol is approved and
real verified songs are supplied.

| Candidate pipeline | Input form | Stages and output | Published expectation | Measured here |
| --- | --- | --- | --- | --- |
| Current text-agnostic baseline | Plain lyrics + audio | PCM preflight -> energy/flux/voicedness -> Boundary-DP -> monotonic LRC | Explainable and offline; literature supports structure/DP as a line/paragraph approach ([Lee & Cremer](https://ismir2008.ismir.net/papers/ISMIR2008_126.pdf), accessed 2026-11-13). |  |
| Current timed-LRC retimer | Existing LRC + same recording | Global shift/drift fit -> local evidence snap -> monotonic clamp | Should be strongest low-cost form when the supplied LRC is already correct; this is an inference, not a published number. |  |
| Full mix + CTC/phoneme aligner | Plain lyrics + mixed song | Language/script normalization -> CTC emissions -> constrained Viterbi/trellis -> line/word aggregation | CTC/character systems report strong published results on some benchmarks ([Stoller et al.](https://arxiv.org/abs/1902.06797), [Vaglio et al.](https://program.ismir2020.net/static/final_papers/101.pdf), accessed 2026-11-13). Singing-domain and language coverage remain risks. |  |
| Full mix + MMS_FA | Plain lyrics + mixed song | MMS_FA emissions -> token spans -> line aggregation -> confidence/abstention | Public docs state 1,130-language training coverage, but speech-to-singing transfer and exact model terms are unverified ([MMS_FA docs](https://docs.pytorch.org/audio/stable/pipelines.html), accessed 2026-11-13). |  |
| Full mix + WhisperX alignment | Plain lyrics + mixed song | Whisper/VAD -> language-specific phoneme aligner -> supplied-text constrained output | Mature speech tooling and word timestamps are documented; singing performance is unverified ([WhisperX](https://github.com/m-bain/whisperX), accessed 2026-11-13). |  |
| Demucs vocals + CTC/phoneme | Plain lyrics + mixed song | Demucs -> vocal-stem preflight -> CTC/phoneme aligner -> line/word output | Source separation may reduce accompaniment interference; recent ALT work reports consistent WER reductions when using separation, but exact alignment benefit is unverified ([Syed et al.](https://arxiv.org/abs/2506.15514), accessed 2026-11-13). |  |
| Demucs vocals + DTW to synthesized speech | Plain lyrics + mixed song | Demucs -> text-to-speech or phonetic template -> constrained DTW -> line/word output | Classical work supports separated-vocal/acoustic correspondence; the specific IEEE record is blocked in this audit, so expectation is unverified. |  |
| Reference recording + multiscale DTW | Timed lyrics + alternate recording | Reference/target MFCC, log-mel and chroma -> multiscale/banded DTW -> map reference boundaries | Sync Toolbox documents multiscale and high-resolution synchronization; reference branch is the most directly matched use case ([Sync Toolbox](https://groupmm.github.io/synctoolbox/build/html/index.html), accessed 2026-11-13). |  |
| Reference recording + learned embedding DTW | Timed lyrics + alternate recording | Learned/self-supervised audio embeddings -> banded DTW -> boundary mapping | RysUp Align provides public audio-to-audio benchmark context, but it is not lyrics alignment and no LyricSync result exists ([benchmark](https://github.com/rysupaudio-lab/rysupalign-bench), accessed 2026-11-13). |  |
| Structure-anchored Boundary-DP | Plain lyrics + audio | Self-similarity/novelty -> repeated-section anchors -> gap/skip/insert DP -> line output | LyricAlly and Lee–Cremer support structure-first reasoning; exact improvement over baseline must be measured ([LyricAlly](https://www.comp.nus.edu.sg/~kanmy/wing/publication/10-1109-tasl-2007-911559/), accessed 2026-11-13). |  |
| Pitch-assisted Boundary-DP | Plain lyrics + audio | Pitch/note onset profile + vocal evidence -> constrained DP -> line output | Joint pitch work reports improved alignment and fewer cross-line errors; exact transfer to this deterministic engine is unverified ([Huang et al.](https://arxiv.org/abs/2202.01646), accessed 2026-11-13). |  |
| Fusion and abstention cascade | Any supported form | Run independent candidates -> robust consensus -> confidence calibration -> repair/review/abstain | Literature suggests different evidence streams fail differently; fusion benefit is an inference requiring ablation. |  |

## Replacement rule

The current default may be replaced only if a candidate satisfies all of the
following on a pre-registered, held-out evaluation:

1. It improves paired median absolute line-start error and percentage-correct
   onsets over the current default on the ordinary-vocal stratum.
2. The improvement is at least the measured human annotation noise floor plus a
   pre-declared practical margin, not merely a statistically noisy difference.
3. It does not materially worsen abstention precision, text-mismatch handling,
   repeated-chorus behavior or the multilingual/script strata.
4. Its runtime, memory, model terms and offline packaging fit the product
   constraints, or it is kept as an optional research adapter.

No thresholds are filled here; they belong to
`research/experiment-plan.md` and must be fixed before running experiments.
