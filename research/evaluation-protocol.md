# Evaluation protocol (design only)

Status: design; no experiments were run in this phase.  
Audit date: 2026-11-13.

## Evidence and comparability

The protocol follows the metric families documented by
[`mir_eval.alignment`](https://mir-eval.readthedocs.io/latest/api/alignment.html)
(accessed 2026-11-13): absolute error, percentage-correct timestamps and
percentage-correct segments. The MIREX lyrics-alignment specification uses a
0.3-second onset tolerance window; the user-centered evaluation paper notes
that this is a convention rather than a psychology-validated constant. Sources:
[MIREX specification](https://www.music-ir.org/mirex/wiki/2024%3ALyrics-to-Audio_Alignment)
and [Lizé-Masclef et al.](https://archives.ismir.net/ismir2021/paper/000052.pdf),
both checked 2026-11-13. The MIREX page was blocked in the Phase 1 browser
audit, so its text is recorded as a search-result lead and must be rechecked
before publication.

Every report must state: dataset version, split, song count, unit (line/word),
whether missing predictions were abstentions, tolerance, and whether the value
is macro-averaged per song or pooled over all units.

## Metrics

For song $k$ with reference starts $t_{ki}$ and predicted starts
$\hat t_{ki}$ for $N_k$ matched units:

$$
e_{ki}=|\hat t_{ki}-t_{ki}|.
$$

### Absolute error

$$
\operatorname{AAE}_k=\frac{1}{N_k}\sum_i e_{ki},
\qquad
\operatorname{MedAE}_k=\operatorname{median}_i(e_{ki}).
$$

Report the macro mean/median over songs and the per-song distribution. Do not
pool all words across songs as the only number because long songs would dominate.

### Percentage of correct onsets (PCO)

$$
\operatorname{PCO}_{k,\tau}=\frac{1}{N_k}\sum_i
\mathbf{1}[e_{ki}\le\tau].
$$

Primary tolerance: $\tau=0.30$ seconds, matching the MIREX convention above.
Also report a sensitivity table at 0.10 and 0.50 seconds; these are diagnostic
values, not replacement standards. Strict inequality versus inclusive endpoint
must be fixed in the implementation and documented.

### Percentage of correct segments (PCS)

Represent each unit as an interval $[s_i,e_i]$. Follow the
`percentage_correct_segments` definition in `mir_eval.alignment`: report the
fraction of total reference segment duration that is correctly overlapped by
the prediction after the required ordered matching. If a line has no trusted
end, use the next verified line start as its end and mark the last line’s end as
song-end; report this convention explicitly.

### Coverage

$$
\operatorname{coverage}=\frac{\#\text{units with a valid timestamp}}
{\#\text{reference units}}.
$$

Coverage is separate from accuracy. A system that abstains on difficult lines
must not receive credit for silently dropping them.

### Abstention quality

Define a reference bad/unsafe unit from annotation review (instrumental,
text-mismatch, or no defensible onset). For the set of predicted abstentions:

$$
\operatorname{abstention\ precision}=\frac{\text{unsafe units correctly abstained}}
{\text{all abstained units}},
$$

$$
\operatorname{abstention\ recall}=\frac{\text{unsafe units correctly abstained}}
{\text{all unsafe reference units}}.
$$

Report safe-unit false-abstention rate too. Abstention is a product behavior,
not a failure, when the input is instrumental or text-mismatched.

### Runtime and memory

- **Real-time factor (RTF):** wall-clock alignment time divided by audio
  duration; report feature extraction and model time separately.
- **Peak memory:** maximum resident memory of the complete local process,
  excluding the operating system cache; record whether a model is loaded.
- **Determinism:** repeat the same run three times and report whether timestamps,
  diagnostics and runtime vary. This is a protocol requirement, not a result.

## Unit matching and text mismatch

The primary score matches units by stable lyric line/word IDs, not by fuzzy text
similarity after the run. If the sung performance skips, repeats or adds a line:

1. Annotate the text relationship (`same`, `skipped`, `repeated`, `extra`,
   `uncertain`).
2. Score exact-ID units that exist in both reference and prediction.
3. Score skipped/extra units in a separate mismatch report, not as a timing error
   against a fabricated timestamp.
4. Report coverage over supplied units and over actually sung units.
5. For repeated text, use occurrence IDs (`chorus#1`, `chorus#2`) so a correct
   timing cannot be matched to the wrong repetition.

## Statistical comparison

- Use paired per-song differences against the current default.
- Bootstrap songs, not individual lyric units, with at least 10,000 resamples
  once the dataset is large enough; report 95% confidence intervals.
- On a roughly 10-song set, report direction and uncertainty only. It cannot
  establish broad language or genre generalization, estimate a stable tail
  failure rate, or validate learned models.
- Predeclare the primary metric and stratum. For multiple engines/metrics, use
  a Holm correction over the finite family of planned primary comparisons; keep
  exploratory metrics labeled exploratory.
- Keep artist/album and alternate versions in the same split to avoid leakage.

## Required report layout

Every experiment report must contain: input form, engine/config hash, dataset
and split, strata, number of songs/lines/words, timing unit, all metrics above,
abstentions and reasons, runtime/memory, failures, confidence intervals, and a
published-evidence/inference/own-measurement distinction.
