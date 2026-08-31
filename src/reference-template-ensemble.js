import { alignWithReferenceTemplates } from "./reference-template-aligner.js";
import { summarizeClusteredConsensus, summarizeConsensus, summarizeWeightedConsensus } from "./consensus-aligner.js";

/**
 * Run multiple deterministic reference-template configurations and expose
 * median timing plus disagreement. Candidate errors can be correlated, so
 * consensus is a review signal rather than a correctness guarantee.
 */
export function alignWithReferenceTemplateEnsemble({ variants, lyrics, duration, ...alignmentInput }) {
  const lines = Array.isArray(lyrics) ? lyrics : lyrics?.lines;
  if (!Array.isArray(lines) || !lines.length || !Array.isArray(variants) || !variants.length) throw new Error("Reference-template ensemble requires lyric lines and at least one variant.");
  const requestedVariantCount = variants.length;
  const maxVariants = Number.isFinite(alignmentInput.ensembleOptions?.maxVariants) ? Math.max(1, Math.floor(alignmentInput.ensembleOptions.maxVariants)) : 8;
  const selectedVariants = variants.slice(0, maxVariants);
  const ensembleStarted = now();
  const candidates = selectedVariants.map((variant, index) => {
    const name = String(variant?.name || `variant_${index + 1}`);
    throwIfAborted(alignmentInput.signal);
    const started = now();
    const alignment = alignWithReferenceTemplates({ ...alignmentInput, lyrics: lines, targetDuration: alignmentInput.targetDuration ?? duration, options: variant?.options || {} });
    return { name, alignment, runtimeMs: now() - started };
  });
  const confidenceScale = Number.isFinite(alignmentInput.ensembleOptions?.confidenceScale) && alignmentInput.ensembleOptions.confidenceScale > 0 ? alignmentInput.ensembleOptions.confidenceScale : 0.5;
  const agreementThreshold = Number.isFinite(alignmentInput.ensembleOptions?.agreementThreshold) ? Math.max(0, Math.min(1, alignmentInput.ensembleOptions.agreementThreshold)) : 0.6;
  const maxSpreadSeconds = Number.isFinite(alignmentInput.ensembleOptions?.maxSpreadSeconds) && alignmentInput.ensembleOptions.maxSpreadSeconds >= 0 ? alignmentInput.ensembleOptions.maxSpreadSeconds : 1;
  const weightByConfidence = alignmentInput.ensembleOptions?.weightByConfidence === true;
  const clusterToleranceSeconds = Number.isFinite(alignmentInput.ensembleOptions?.clusterToleranceSeconds) ? Math.max(0, alignmentInput.ensembleOptions.clusterToleranceSeconds) : 0;
  const consensus = lines.map((_, index) => {
    const starts = candidates.map((candidate) => candidate.alignment.lines[index]?.startTime);
    const weights = weightByConfidence ? candidates.map((candidate) => candidate.alignment.lines[index]?.confidence) : starts.map(() => 1);
    if (clusterToleranceSeconds > 0) return summarizeClusteredConsensus(starts, weights, { confidenceScale, clusterToleranceSeconds });
    return weightByConfidence ? summarizeWeightedConsensus(starts, weights, { confidenceScale }) : summarizeConsensus(starts, { confidenceScale });
  });
  const starts = consensus.map((item) => item.startTime);
  const alignedLines = lines.map((line, index) => {
    const summary = consensus[index];
    const failureCategory = summary.confidence < agreementThreshold ? "low_agreement" : summary.outlierCount > 0 ? "cluster_outliers" : summary.spread > maxSpreadSeconds ? "wide_spread" : "stable";
    return { ...line, startTime: summary.startTime, endTime: index + 1 < lines.length ? starts[index + 1] : (Number.isFinite(duration) && duration > 0 ? duration : alignmentInput.targetDuration), alignmentMethod: "reference_template_ensemble", confidence: summary.confidence, reviewRequired: failureCategory !== "stable", alignmentReview: { ...summary, failureCategory } };
  });
  return {
    method: "reference_template_ensemble",
    lines: alignedLines,
    candidates: candidates.map((candidate) => ({ name: candidate.name, method: candidate.alignment.method, starts: candidate.alignment.lines.map((line) => line.startTime), confidence: candidate.alignment.lines.map((line) => line.confidence), runtimeMs: candidate.runtimeMs })),
    consensus,
    confidenceScale,
    weightByConfidence,
    clusterToleranceSeconds,
    agreementThreshold,
    maxSpreadSeconds,
    maxVariants,
    requestedVariantCount,
    truncatedVariantCount: Math.max(0, requestedVariantCount - candidates.length),
    runtimeMs: now() - ensembleStarted,
    candidateRuntimesMs: candidates.map((candidate) => ({ name: candidate.name, runtimeMs: candidate.runtimeMs })),
  };
}

function now() { return globalThis.performance?.now ? globalThis.performance.now() : Date.now(); }
function throwIfAborted(signal) { if (signal?.aborted) { const error = new Error("Reference-template ensemble aborted."); error.name = "AbortError"; throw error; } }
