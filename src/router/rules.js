const ENGINE_COSTS = {
  "retime-lrc": 40,
  "vocal-gated-boundary-dp": 140,
  "silence-aware-boundary-dp": 180,
  "text-weighted-boundary-dp": 160,
  "adaptive-boundary-dp": 110,
  "reference-template-mfcc-dtw": 900,
  "reference-template-ensemble": 1500,
  "energy-baseline": 30,
};

/** Build an ordered, explainable plan from a validated form descriptor. */
export function buildEnginePlan(form, options = {}) {
  const budgetLimit = Number.isFinite(options.budgetMs) && options.budgetMs >= 0 ? options.budgetMs : Infinity;
  const budgetMs = Number.isFinite(budgetLimit) ? budgetLimit : null;
  const entries = [];
  if (form.instrumentalLikelihood !== null && form.instrumentalLikelihood >= 0.85) {
    return {
      refused: true,
      reason: "instrumental_likelihood_high",
      budgetMs,
      entries: [],
      reasons: ["Audio appears instrumental; automatic lyric alignment was refused.", ...form.reasons],
    };
  }
  if (form.hasReference) {
    entries.push({ engine: "reference-template-mfcc-dtw", reason: "verified reference recording supplied" });
    if (budgetLimit >= ENGINE_COSTS["reference-template-ensemble"]) {
      entries.push({ engine: "reference-template-ensemble", reason: "budget allows a reference ensemble cross-check" });
    } else {
      entries.push({
        engine: "reference-template-ensemble",
        reason: "skipped: reference ensemble exceeds budget",
        skipped: true,
      });
    }
  } else if (form.hasTimedLyrics) {
    entries.push({ engine: "retime-lrc", reason: "timed lyrics can be retimed to this recording" });
    entries.push({ engine: "vocal-gated-boundary-dp", reason: "independent vocal-gated cross-check" });
  } else if (form.vocalCoverage !== null && form.vocalCoverage >= 0.2) {
    entries.push({ engine: "vocal-gated-boundary-dp", reason: "vocal coverage proxy is sufficient" });
    entries.push({ engine: "silence-aware-boundary-dp", reason: "pause-aware cross-check" });
    entries.push({ engine: "text-weighted-boundary-dp", reason: "text-length prior, Unicode-safe" });
  } else {
    entries.push({
      engine: "energy-baseline",
      reason: "energy fallback; every line requires review",
      reviewRequired: true,
    });
  }
  if (form.dominantScript && !["Latin", "other"].includes(form.dominantScript)) {
    entries.push({
      engine: "text-weighted-boundary-dp",
      reason: "non-Latin script prefers grapheme-safe text weighting",
      flag: "non_latin_script",
    });
  }
  const selected = [];
  let spent = 0;
  for (const entry of entries) {
    const estimatedMs = ENGINE_COSTS[entry.engine] || 200;
    if (entry.skipped) {
      selected.push({ ...entry, estimatedMs });
      continue;
    }
    if (spent + estimatedMs > budgetLimit && selected.some((item) => !item.skipped)) {
      selected.push({ ...entry, estimatedMs, skipped: true, reason: `skipped: budget ${budgetMs}ms exhausted` });
      continue;
    }
    spent += estimatedMs;
    selected.push({ ...entry, estimatedMs });
  }
  return { refused: false, budgetMs, estimatedMs: spent, entries: selected, reasons: form.reasons };
}
