# Experiment plan

Status: pre-registration design; no experiments were run in this phase.  
Audit date: 2026-11-13.

## Shared protocol

All experiments use the protocol in `research/evaluation-protocol.md` and the
annotation rules in `research/annotation-guide.md`. The primary unit is a lyric
line start for the current product, with word-level scores added only when the
reference has word boundaries. Primary metrics are macro-song MedAE and PCO at
0.30 seconds; coverage, abstention quality, PCS, RTF and peak memory are
secondary. Every run records the exact config, engine version, input hashes,
split and diagnostics.

The data split is by song and by artist/album. Every recording/version of one
song stays in one split. No online services receive audio or lyrics.

## Experiments

| ID | Hypothesis | Independent variables | Dependent variables / metric | Data needed | Fixed decision threshold | Stop condition | Expected effort |
| --- | --- | --- | --- | --- | --- | --- | --- |
| E-1 data/evaluation infrastructure | A verified, double-annotated corpus and runner are prerequisites for trustworthy engine comparisons | Annotation policy, song hashes, strata, split, annotator pair | Inter-annotator MedAE/90th percentile; schema validity; deterministic rerun | 3–5 privately verified songs plus public metadata; no new download required | Schema pass 100%; monotonic references 100%; noise-floor report complete | Stop before engine comparison if any reference lacks version/hash/stratum or annotators cannot adjudicate | Low-medium; annotation time dominates |
| E0 current baseline | Existing engines provide a reproducible per-form baseline and expose failure strata | Timed-LRC retime, Boundary-DP, current automatic router; fixed config | MedAE, PCO@0.3, PCS, coverage, abstention precision/recall, RTF, memory | Held-out verified songs covering minimum strata | Runner must produce all metrics and diagnostics; no quality threshold yet | Stop and repair infrastructure if outputs are non-deterministic or invalid | Medium |
| E1 onset/vocal evidence ablation | Vocalness and onset evidence improve line starts over energy alone | Energy only vs flux vs voicedness vs fused profiles | Paired MedAE/PCO and false-abstention rate | Same E0 songs; no changed text | Keep a profile only if MedAE improves by at least 0.05 s or PCO by 3 pp without >5 pp regression in any stratum | Stop profile branch if no profile beats energy on ordinary vocals | Medium |
| E2 Boundary-DP gap/skip/insert states | Explicit gaps and sequence edits reduce intro, break and mismatch failures | Baseline DP vs gap-only vs gap+skip+insert; fixed penalties | Line MedAE/PCO, mismatch handling, coverage, abstention precision | Songs with long intros, instrumental breaks, skipped/repeated lines | Adopt a state only if primary MedAE improves ≥0.10 s on its target strata and overall PCO does not drop >2 pp | Stop extra states if they increase false timestamps on instrumental cases by >5 pp | Medium-high |
| E3 structure/repeated anchors | Section anchors resolve repeated choruses and reduce occurrence swaps | No anchors vs self-similarity/novelty anchors; anchor confidence | Occurrence-ID accuracy, line MedAE, repeated-chorus PCO | Songs with at least two repeated sections | Require ≥10 pp improvement in repeated-occurrence accuracy and no >2 pp ordinary-stratum PCO loss | Stop if anchors select wrong sections in >20% of repeated cases | Medium-high |
| E4 reference-recording DTW | A verified reference recording is substantially better for alternate versions than text-agnostic timing | MFCC vs log-mel vs chroma; full vs multiscale/banded DTW | Boundary MedAE/PCO, path violations, RTF/memory | Matched reference/target pairs including tempo/edit differences | Candidate must beat no-reference baseline by ≥0.10 s MedAE and ≥5 pp PCO on alternate-version stratum | Stop feature variant if path exits constraints or runtime exceeds 5× baseline | High |
| E5 isolated CTC/phoneme candidate | A text-aware model answers the largest question: whether language/phonetic evidence materially beats DSP/DP | Full mix vs local vocal input; CTC model/language; line aggregation | Word/line MedAE/PCO, coverage, text mismatch abstention, RTF, memory | Run only with a model whose terms and hashes are recorded; no model download without owner approval | Continue only if it beats E0 by ≥max(0.10 s, human-noise-floor median) MedAE and ≥5 pp PCO, with no >5 pp stratum regression and abstention precision ≥0.80 | Stop model branch if model/license cannot be documented, singing failure is systematic, or CPU resource exceeds declared limit | Very high; model setup and audit |
| E6 full mix vs separated vocals | Separation helps only when artifacts do not erase useful timing evidence | Full mix, Demucs stem, Open-Unmix stem, optional vocalness gate | Paired MedAE/PCO, separation disagreement, RTF/memory | MUSDB/MUSDB-ALT if approved plus private songs; no downloads in this phase | Adopt stem preprocessing only if it improves target strata by ≥0.10 s and does not worsen ordinary vocals by >2 pp PCO | Stop if artifact disagreement or runtime makes the product path impractical | High |
| E7 fusion and abstention | Independent hypotheses plus calibrated abstention outperform any single path | Median/weighted consensus, confidence thresholds, refusal rules | MedAE/PCO, abstention precision/recall, safe false-abstention rate | All E0–E6 outputs on validation split | Fusion must improve PCO ≥3 pp and retain abstention precision ≥0.80; thresholds fixed on validation only | Stop if consensus hides a catastrophic outlier or confidence is uncalibrated | Medium-high |
| E8 local learning from corrections | Bounded correction priors help the same user’s collection without leaking across artists/splits | No correction prior vs per-engine bounded bias/tempo hint; train/validation split by song/artist | Held-out MedAE/PCO, calibration, leakage checks | Improvement ≥0.05 s MedAE on held-out songs with no >2 pp drop in any stratum | Stop if any held-out artist benefits only when seen in training or if corrections grow unbounded | Medium |
| E9 stress/generalization | Failure-aware evaluation reveals where the chosen engine should abstain | Language/script, quiet vocals, remixes, covers/live, dense backing, rap/spoken, instrumental-heavy | Per-stratum MedAE/PCO/coverage/abstention; worst-stratum gap | Minimum strata below; public Indic data only if owner approves terms | No claim of generalization unless each claimed stratum has minimum count and CIs | Stop a claim, not the project, when a stratum lacks evidence | Medium-high |

## Minimum strata

The first real set should aim for at least five songs per stratum, with ten
preferred: ordinary vocal, two languages/scripts, long intro, instrumental-heavy,
cover/live/alternate mix, slowed/remix, repeated choruses, rap/spoken, dense
backing vocals. A ten-song total set can show deterministic regressions and
obvious failures, but cannot establish robust language or genre generalization.

## Pre-registered replacement rule

The current deterministic default loses only if one candidate, on the held-out
split:

1. improves macro-song MedAE by at least
   `max(0.10 seconds, human-noise-floor median disagreement)`;
2. improves PCO@0.30 by at least 5 percentage points;
3. has no stratum PCO regression greater than 5 percentage points;
4. has abstention precision at least 0.80 and coverage reported separately;
5. stays within the declared CPU/memory budget and has documented code,
   model-weight and dataset licenses; and
6. reproduces the result in a second held-out run or bootstrap interval whose
   paired difference excludes zero.

If no candidate meets all conditions, keep the current default and adopt only
the isolated component whose ablation passes its own threshold. A candidate may
remain an optional research adapter even when it does not replace the default.

## Text-agnostic versus text-aware inference

**Inference:** text-agnostic profiles and Boundary-DP are safer for unknown
languages, offline operation and abstention, but cannot verify that the sung
words match the supplied text. **Inference from published evidence:** CTC,
phoneme and character systems can use known text to localize units more
precisely, but their performance depends on singing-domain acoustics,
pronunciation resources and model terms. This inference rests on the HMM,
Stoller, multilingual CTC, pitch-assisted and masked-phoneme papers in
`research/literature-matrix.md`; it is not an own-data result.
