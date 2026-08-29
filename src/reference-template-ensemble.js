import { alignWithReferenceTemplates } from "./reference-template-aligner.js";
import { summarizeConsensus, summarizeWeightedConsensus } from "./consensus-aligner.js";

/**
 * Run multiple deterministic reference-template configurations and expose
 * median timing plus disagreement. Candidate errors can be correlated, so
 * consensus is a review signal rather than a correctness guarantee.
 */
export function alignWithReferenceTemplateEnsemble({ variants, lyrics, duration, ...alignmentInput }) {
  const lines = Array.isArray(lyrics) ? lyrics : lyrics?.lines;
  if (!Array.isArray(lines) || !lines.length || !Array.isArray(variants) || !variants.length) throw new Error("Reference-template ensemble requires lyric lines and at least one variant.");
  const candidates = variants.map((variant, index) => {
    const name = String(variant?.name || `variant_${index + 1}`);
    const alignment = alignWithReferenceTemplates({ ...alignmentInput, lyrics: lines, targetDuration: alignmentInput.targetDuration ?? duration, options: variant?.options || {} });
    return { name, alignment };
  });
  const confidenceScale = Number.isFinite(alignmentInput.ensembleOptions?.confidenceScale) && alignmentInput.ensembleOptions.confidenceScale > 0 ? alignmentInput.ensembleOptions.confidenceScale : 0.5;
  const agreementThreshold = Number.isFinite(alignmentInput.ensembleOptions?.agreementThreshold) ? Math.max(0, Math.min(1, alignmentInput.ensembleOptions.agreementThreshold)) : 0.6;
  const maxSpreadSeconds = Number.isFinite(alignmentInput.ensembleOptions?.maxSpreadSeconds) && alignmentInput.ensembleOptions.maxSpreadSeconds >= 0 ? alignmentInput.ensembleOptions.maxSpreadSeconds : 1;
  const weightByConfidence = alignmentInput.ensembleOptions?.weightByConfidence === true;
  const consensus = lines.map((_, index) => {
    const starts = candidates.map((candidate) => candidate.alignment.lines[index]?.startTime);
    return weightByConfidence
      ? summarizeWeightedConsensus(starts, candidates.map((candidate) => candidate.alignment.lines[index]?.confidence), { confidenceScale })
      : summarizeConsensus(starts, { confidenceScale });
  });
  const starts = consensus.map((item) => item.startTime);
  const alignedLines = lines.map((line, index) => {
    const summary = consensus[index];
    const failureCategory = summary.confidence < agreementThreshold ? "low_agreement" : summary.spread > maxSpreadSeconds ? "wide_spread" : "stable";
    return { ...line, startTime: summary.startTime, endTime: index + 1 < lines.length ? starts[index + 1] : (Number.isFinite(duration) && duration > 0 ? duration : alignmentInput.targetDuration), alignmentMethod: "reference_template_ensemble", confidence: summary.confidence, reviewRequired: failureCategory !== "stable", alignmentReview: { ...summary, failureCategory } };
  });
  return {
    method: "reference_template_ensemble",
    lines: alignedLines,
    candidates: candidates.map((candidate) => ({ name: candidate.name, method: candidate.alignment.method, starts: candidate.alignment.lines.map((line) => line.startTime), confidence: candidate.alignment.lines.map((line) => line.confidence) })),
    consensus,
    confidenceScale,
    weightByConfidence,
    agreementThreshold,
    maxSpreadSeconds,
  };
}
