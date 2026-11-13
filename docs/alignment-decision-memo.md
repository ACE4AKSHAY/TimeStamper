# LyricSync alignment decision memo

Decision date: 2026-11-13  
Status: research decision, not an implementation approval. No real LyricSync
accuracy measurement has been run in this package.

## Problem map and recommendation

LyricSync has four materially different input forms:

| Input form | Recommended approach | Confidence | Why |
| --- | --- | --- | --- |
| Existing timed LRC + same/similar recording | Robust shift/drift retiming, local evidence snap, monotonic validation and abstention | High | It preserves trusted user timing and avoids language recognition; this is an engineering conclusion, not a measured result. |
| Plain lyrics + song, no reference | Keep DSP/voicedness/Boundary-DP as the safe default; add gap/skip/insert states and structure anchors | Medium | Published classical work supports structure/DP, but text-agnostic features cannot prove the sung words. |
| Plain lyrics + song, high-accuracy optional path | Test isolated CTC/phoneme alignment early, first on full mix and then on vocals | Medium-low | Stoller, multilingual CTC and newer phoneme work show potential, but singing, language and model-license gaps are material. |
| Known timed lyrics + alternate recording | Reference-recording multiscale/banded DTW using MFCC/log-mel/chroma comparisons | High | This is the direct audio-to-audio case and has mature synchronization methods; it requires a verified reference. |

The product recommendation is therefore a **cascade**, not an immediate scrap of
the current engine: classify the input, use the deterministic path first, run
optional text-aware/reference candidates when their prerequisites are present,
then fuse only when confidence and failure diagnostics permit it.

## Evidence and experiment order

The literature matrix records classical HMM/DP, Stoller’s end-to-end character
model, multilingual CTC, pitch-assisted alignment, source-separation studies,
and audio-to-audio DTW. Their metrics are not directly rankable because units,
datasets, tolerances and splits differ. The pre-registered order is:

1. Build the verified-case corpus, double-annotation noise floor and deterministic
   runner (E-1).
2. Measure the current engines on real verified songs (E0).
3. Run onset/voicedness ablations, gap/skip/insert DP and structure anchors
   (E1–E3).
4. Test reference DTW variants (E4).
5. Test one isolated CTC/phoneme candidate early (E5), before investing in
   separation or fusion.
6. Compare full mix versus separated vocals (E6), then fusion/abstention and
   leakage-safe correction learning (E7–E8).
7. Stress-test all claimed strata (E9).

## Top five open questions

1. How much does the current deterministic baseline err on the owner’s verified
   songs after the human noise floor is measured?
2. Does an available CTC/phoneme model support the owner’s scripts and singing
   without unacceptable CPU/model cost?
3. Does vocal separation improve timing enough to offset artifacts and runtime?
4. Can repeated choruses and text mismatch be detected well enough to abstain
   instead of producing confidently wrong LRC?
5. How should the app package optional models without changing the unlicensed,
   offline-first repository or uploading private media?

## Main risks

- **Singing-domain gap:** speech-trained forced aligners can fail on sustained
  notes, melisma, accompaniment and backing vocals.
- **Language/script gap:** the reviewed public evidence does not establish a
  Telugu/Hindi/Indic singing-alignment benchmark.
- **Licenses:** code, model weights, training data and audio annotations have
  separate terms; no dependency should be adopted without a manifest audit.
- **Size/runtime:** separation and CTC models may conflict with a lightweight
  desktop/offline target.
- **Wrong confidence:** a timestamp is worse than an explicit review/abstain
  result when the recording version or lyric text is wrong.

## What would change my recommendation

| Evidence observed | Recommendation change |
| --- | --- |
| Timed-LRC retiming fails the ordinary-vocal set by more than the measured human noise floor | Revisit the baseline and prioritize a text-aware or reference branch. |
| A documented CTC/phoneme candidate beats the replacement rule on held-out songs and every claimed language/script stratum | Make it the optional or primary plain-lyrics engine, subject to packaging/license review. |
| Vocal separation improves target strata but harms ordinary vocals | Keep separation as a gated per-song option, not a universal preprocessor. |
| Reference DTW consistently wins alternate-version cases | Make reference recording a first-class workflow and keep it separate from plain-lyrics alignment. |
| No candidate beats the deterministic cascade after noise-floor and confidence checks | Keep the current default and improve diagnostics/abstention rather than adding heavier dependencies. |

Overall confidence: **high** that a cascade is the correct product structure;
**medium** that Boundary-DP is the best lightweight plain-lyrics baseline;
**low** that any specific learned model will generalize to the owner’s
multilingual singing collection before E5 is measured.
