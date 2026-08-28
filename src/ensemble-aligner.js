import { alignByAdaptiveBoundaryDp } from "./adaptive-boundary-aligner.js";
import { refineBoundarySegments } from "./boundary-refiner.js";
import { summarizeConsensus } from "./consensus-aligner.js";
import { alignByTextWeightedBoundaryDp } from "./text-weighted-aligner.js";

/**
 * Run several deterministic boundary candidates and expose their agreement as
 * a review signal. The median of monotonic candidate starts remains monotonic,
 * while low-agreement lines are explicitly marked instead of being concealed.
 */
export function alignByEnsemble(lines, profile, duration, options = {}) {
  if (!Array.isArray(lines) || !lines.length || !Array.isArray(profile) || !profile.length || !Number.isFinite(duration) || duration <= 0) throw new Error("Ensemble alignment requires lyric lines, a non-empty profile, and a positive duration.");
  const adaptive = alignByAdaptiveBoundaryDp(lines, profile, duration, options);
  const textWeighted = alignByTextWeightedBoundaryDp(lines, profile, duration, options);
  const refined = refineBoundarySegments(adaptive.segments, profile, duration, options);
  const candidates = [
    { name: "adaptive_boundary_dp", alignment: adaptive },
    { name: "text_weighted_boundary_dp", alignment: textWeighted },
    { name: "local_boundary_refinement", alignment: refined },
  ];
  const confidenceScale = Number.isFinite(options.confidenceScale) && options.confidenceScale > 0 ? options.confidenceScale : 0.5;
  const agreementThreshold = Number.isFinite(options.agreementThreshold) ? Math.max(0, Math.min(1, options.agreementThreshold)) : 0.6;
  const maxSpreadSeconds = Number.isFinite(options.maxSpreadSeconds) && options.maxSpreadSeconds >= 0 ? options.maxSpreadSeconds : 1;
  const starts = lines.map((_, index) => candidates.map((candidate) => candidate.alignment.segments[index].startTime));
  const consensus = starts.map((values) => summarizeConsensus(values, { confidenceScale }));
  const consensusStarts = consensus.map((item) => item.startTime);
  const alignedLines = lines.map((line, index) => {
    const summary = consensus[index];
    const failureCategory = summary.confidence < agreementThreshold ? "low_agreement" : summary.spread > maxSpreadSeconds ? "wide_spread" : "stable";
    return { ...line, startTime: summary.startTime, endTime: index + 1 < lines.length ? consensusStarts[index + 1] : duration, alignmentMethod: "ensemble_boundary_consensus", confidence: summary.confidence, alignmentReview: { ...summary, failureCategory } };
  });
  return { lines: alignedLines, candidates: candidates.map((candidate) => ({ name: candidate.name, method: candidate.alignment.method, starts: candidate.alignment.segments.map((segment) => segment.startTime), cost: candidate.alignment.cost ?? null })), consensus, confidenceScale, agreementThreshold, maxSpreadSeconds, method: "ensemble_boundary_consensus" };
}
