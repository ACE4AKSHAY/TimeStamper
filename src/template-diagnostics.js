import { constrainedDtw } from "./dtw.js";
import { constrainedDtwBanded } from "./dtw-banded.js";

/**
 * Recompute line costs and boundary-review metadata for an existing template
 * segmentation. This is used after an opt-in boundary refinement pass moves
 * split points; the original coarse DP remains responsible for the path.
 */
export function recomputeTemplateDiagnostics(audioFrames, lineTemplates, segments, options = {}) {
  if (!Array.isArray(segments) || !segments.length) return { segments: segments || [], diagnostics: { boundaries: [] } };
  const featureStride = Math.max(1, Math.floor(options.featureStride ?? 1));
  const searchTemplates = featureStride === 1 ? lineTemplates : lineTemplates.map((template) => template.filter((_, index) => index % featureStride === 0));
  const implementation = options.dtwImplementation === "banded" ? constrainedDtwBanded : constrainedDtw;
  const window = Number.isFinite(options.window) && featureStride > 1 ? Math.max(1, Math.ceil(options.window / featureStride)) : options.window;
  const minLength = Math.max(1, Math.floor(options.minLength ?? 1));
  const selectedCosts = segments.map((segment, index) => {
    const cost = safeCandidateCost(audioFrames, searchTemplates[index], segment.startFrame, segment.endFrame, window, featureStride, implementation);
    return Number.isFinite(cost) ? cost : (Number.isFinite(segment.cost) ? segment.cost : Infinity);
  });
  const orderedCosts = selectedCosts.filter(Number.isFinite).sort((left, right) => left - right);
  const middle = Math.floor(orderedCosts.length / 2);
  const medianCost = orderedCosts.length ? (orderedCosts.length % 2 ? orderedCosts[middle] : (orderedCosts[middle - 1] + orderedCosts[middle]) / 2) : 0;
  const baseline = Number.isFinite(options.confidenceScale) && options.confidenceScale > 0 ? options.confidenceScale : Math.max(medianCost, 1e-9);
  const reviewThreshold = Number.isFinite(options.reviewThreshold) ? Math.min(1, Math.max(0, options.reviewThreshold)) : 0.5;
  const marginFrames = Math.max(0, Math.floor(options.marginFrames ?? 1));
  const boundaryMarginThreshold = Number.isFinite(options.boundaryMarginThreshold) ? Math.max(0, options.boundaryMarginThreshold) : 0.05;
  const boundaryDiagnostics = segments.slice(0, -1).map((left, index) => {
    const right = segments[index + 1], chosenCost = selectedCosts[index] + selectedCosts[index + 1];
    let bestAlternative = Infinity;
    for (let shift = -marginFrames; shift <= marginFrames; shift++) {
      if (!shift) continue;
      const boundary = left.endFrame + shift;
      if (boundary - left.startFrame < minLength || right.endFrame - boundary < minLength) continue;
      const alternative = safeCandidateCost(audioFrames, searchTemplates[index], left.startFrame, boundary, window, featureStride, implementation)
        + safeCandidateCost(audioFrames, searchTemplates[index + 1], boundary, right.endFrame, window, featureStride, implementation);
      bestAlternative = Math.min(bestAlternative, alternative);
    }
    const margin = Number.isFinite(bestAlternative) ? Math.max(0, bestAlternative - chosenCost) : null;
    const marginRatio = margin === null ? null : margin / Math.max(Math.abs(chosenCost), 1e-9);
    return { boundaryIndex: index, marginCost: margin, marginRatio, stable: marginRatio === null ? null : marginRatio >= boundaryMarginThreshold };
  });
  const boundaryByLine = new Map();
  for (const boundary of boundaryDiagnostics) {
    boundaryByLine.set(boundary.boundaryIndex, { endBoundary: boundary });
    boundaryByLine.set(boundary.boundaryIndex + 1, { ...(boundaryByLine.get(boundary.boundaryIndex + 1) || {}), startBoundary: boundary });
  }
  const diagnostics = segments.map((segment, index) => {
    const cost = selectedCosts[index];
    const relativeCost = cost / baseline;
    const confidence = Math.min(1, baseline / Math.max(cost, 1e-9));
    const boundary = boundaryByLine.get(index) || {};
    const unstableBoundary = boundary.startBoundary?.stable === false || boundary.endBoundary?.stable === false;
    const highRelativeCost = confidence < reviewThreshold;
    const failureCategory = highRelativeCost && unstableBoundary ? "high_relative_cost_and_unstable_boundary" : highRelativeCost ? "high_relative_cost" : unstableBoundary ? "unstable_boundary" : "stable";
    return { lineIndex: segment.lineIndex, cost, relativeCost, confidence, reviewRequired: highRelativeCost || unstableBoundary, failureCategory, startBoundary: boundary.startBoundary || null, endBoundary: boundary.endBoundary || null };
  });
  return {
    segments: segments.map((segment, index) => ({ ...segment, ...diagnostics[index] })),
    diagnostics: { medianCost, baseline, reviewThreshold, marginFrames, boundaryMarginThreshold, featureStride, dtwImplementation: options.dtwImplementation === "banded" ? "banded" : "full-matrix", dtwWindow: window, boundaries: boundaryDiagnostics },
  };
}

function safeCandidateCost(audioFrames, template, start, end, window, featureStride, implementation) {
  try {
    const segment = featureStride === 1 ? audioFrames.slice(start, end) : audioFrames.slice(start, end).filter((_, index) => index % featureStride === 0);
    return implementation(template, segment, { window }).normalizedCost;
  } catch {
    return Infinity;
  }
}
