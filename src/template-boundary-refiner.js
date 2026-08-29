import { constrainedDtw } from "./dtw.js";
import { constrainedDtwBanded } from "./dtw-banded.js";

/**
 * Opt-in local refinement for adjacent MFCC template boundaries. The coarse
 * dynamic program remains authoritative; a boundary moves only when a nearby
 * split lowers the combined DTW cost for both neighbouring lines.
 */
export function refineTemplateBoundaries(audioFrames, templates, segments, options = {}) {
  if (!Array.isArray(segments) || segments.length < 2) return { segments: segments || [], diagnostics: [], method: "template_boundary_refinement" };
  const radius = Math.max(0, Math.floor(options.radius ?? 0));
  if (!radius) return { segments: segments.map((segment) => ({ ...segment })), diagnostics: [], method: "template_boundary_refinement" };
  const implementation = options.dtwImplementation === "banded" ? constrainedDtwBanded : constrainedDtw;
  const window = options.window;
  const minLength = Math.max(1, Math.floor(options.minLength ?? 1));
  const refined = segments.map((segment) => ({ ...segment }));
  const diagnostics = [];
  for (let index = 0; index < refined.length - 1; index++) {
    const left = refined[index], right = refined[index + 1], originalBoundary = left.endFrame;
    const currentCost = pairCost(audioFrames, templates[index], templates[index + 1], left.startFrame, originalBoundary, right.endFrame, implementation, window);
    let best = { boundary: originalBoundary, cost: currentCost };
    for (let shift = -radius; shift <= radius; shift++) {
      if (!shift) continue;
      const boundary = originalBoundary + shift;
      if (boundary - left.startFrame < minLength || right.endFrame - boundary < minLength) continue;
      const cost = pairCost(audioFrames, templates[index], templates[index + 1], left.startFrame, boundary, right.endFrame, implementation, window);
      if (cost < best.cost) best = { boundary, cost };
    }
    const margin = Math.max(0, currentCost - best.cost);
    left.endFrame = best.boundary;
    right.startFrame = best.boundary;
    left.endTime = best.boundary / options.frameRate;
    right.startTime = best.boundary / options.frameRate;
    diagnostics.push({ boundaryIndex: index, originalBoundary, refinedBoundary: best.boundary, shiftFrames: best.boundary - originalBoundary, originalCost: currentCost, refinedCost: best.cost, improvement: margin, changed: best.boundary !== originalBoundary });
  }
  return { segments: refined, diagnostics, method: "template_boundary_refinement" };
}

function pairCost(audioFrames, leftTemplate, rightTemplate, leftStart, boundary, rightEnd, implementation, window) {
  try {
    return implementation(leftTemplate, audioFrames.slice(leftStart, boundary), { window }).normalizedCost + implementation(rightTemplate, audioFrames.slice(boundary, rightEnd), { window }).normalizedCost;
  } catch {
    return Infinity;
  }
}
