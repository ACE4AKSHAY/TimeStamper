# Failure taxonomy

Status: design only; no real audio was run in this phase.  
Audit date: 2026-11-13. The taxonomy combines published problem descriptions
with engineering inference; each row states which kind it is.

| Failure | Mathematical reason | Engine families affected | Detection signal | Desired behavior |
| --- | --- | --- | --- | --- |
| Sung text differs from supplied text | The decoder is forced to explain frames with a wrong state/line sequence; likelihood and boundary costs become systematically high | CTC/HMM/phoneme, text-weighted DP, TTS-DTW | Text-to-audio cost spike, low posterior/consensus, annotator mismatch label | Flag `text-mismatch`; abstain on affected units rather than rewrite supplied lyrics |
| Repeated choruses | Identical text creates multiple equally valid paths; unconstrained string matching is non-identifiable | All text-aware methods; reference DTW with repeated sections | Self-similarity/repetition anchors, multiple near-equal DP paths, occurrence-ID disagreement | Use section/occurrence anchors; flag ambiguity if unresolved |
| Ad-libs and non-lexical vocals | Audio contains vocal evidence not represented in text, creating extra peaks or CTC states | Onset/voicedness, CTC, Boundary-DP | Vocal activity without matching text; Jam-ALT-style non-word category | Ignore for supplied-line timing, store as extra event, lower confidence |
| Long intro/outro | Text duration prior assumes lyric coverage across the full recording and shifts the first/last boundaries | Duration-weighted DP, affine retiming, DTW without gaps | Leading/trailing low-vocal ratio and silence/novelty regions | Add explicit gap state; preserve empty intro/outro |
| Instrumental breaks | Energy/onsets are produced without lyric evidence; a monotonic path must insert fake lines | Energy/flux DP, full-mix CTC, weak phonetic models | Low voicedness plus high accompaniment activity | Keep gap, abstain or flag review |
| Melisma | One lyric unit spans many notes/frames; pitch/onset count exceeds text-unit count | Pitch-assisted DP, phoneme/CTC, word interpolation | Long sustained vocal region, note density, duration outlier | Use one start per lyric unit; do not split unless text unit contract allows |
| Backing vocals | Concurrent voices create competing evidence and may sing other text | Vocalness, CTC, separation, onset fusion | Multi-voice or separation disagreement; chorus-density proxy | Prefer lead/reference evidence; lower confidence and flag dense regions |
| Wrong recording/version | The acoustic sequence is not the recording represented by lyrics/timestamps; DTW finds a false local match | Timed-LRC retime, reference DTW, all learned models | Duration/hash/version mismatch, low global similarity, marker diagnostics | Refuse automatic transfer and request correct recording |
| Tempo change or edit | A single affine map cannot represent piecewise time deformation | Global retime, narrow-band DTW, fixed duration priors | Residual drift changes sign or slope; path exits band | Fit piecewise model only with evidence; otherwise review |
| Language/script mismatch | Text tokenization/phoneme inventory has no matching acoustic states; Unicode length is not phonetic evidence | Phoneme/CTC, grapheme duration, text-aware methods | Script detector vs model language, OOV/tokenizer failure, low posterior | Preserve native text; choose compatible plugin or abstain |
| Very quiet vocals | Evidence is below accompaniment/noise floor; observed features are dominated by unrelated audio | SVD, onset/energy, full-mix CTC, separation | Low SNR, low voicedness, high separation uncertainty | Mark low confidence; abstain if no defensible onset |
| Vocal separation artifact | Separation introduces timing smearing, musical leakage or dropped consonants | Demucs/Open-Unmix + any downstream aligner | Full-mix/stem disagreement and artifact score | Keep full-mix result if validated; otherwise review |
| Repeated/inserted lyric line | Supplied sequence length differs from sung sequence; DP path needs skip/insert states | Plain-text DP and CTC forced alignment | Excessive gap/skip cost or unmatched line IDs | Explicit skip/insert state, report mismatch rather than force timing |

## Design principle

The safest output is not always a timestamp. Repair only when the evidence is
strong and the correction is explainable; otherwise flag for review or abstain.
This is an inference grounded in the published observation that accompaniment,
singing variation and text mismatch make lyrics alignment harder than speech
alignment ([Stoller et al.](https://arxiv.org/abs/1902.06797), accessed
2026-11-13).
