import { alignByBoundaryDp } from "./boundary-dp-aligner.js";
import { alignByIntroAwareBoundaryDp } from "./intro-aware-aligner.js";

/**
 * Select the intro-aware candidate only when its detected leading intro is
 * substantial. This keeps the original Boundary-DP behavior for ordinary
 * tracks and makes the selection rule explicit and inspectable.
 */
export function alignByAdaptiveBoundaryDp(lines, profile, duration, options = {}) {
  const introCandidate = alignByIntroAwareBoundaryDp(lines, profile, duration, options);
  const minimumIntroFrames = Math.max(0, Math.floor(options.minimumIntroFrames ?? 3));
  if (introCandidate.introFrame < minimumIntroFrames) {
    const baseline = alignByBoundaryDp(lines, profile, duration, options);
    return { ...baseline, selectedEngine: "boundary-dp", introFrame: introCandidate.introFrame, introTime: introCandidate.introTime, minimumIntroFrames, method: "adaptive_boundary_dynamic_programming" };
  }
  return { ...introCandidate, selectedEngine: "intro-aware-boundary-dp", minimumIntroFrames, method: "adaptive_boundary_dynamic_programming" };
}
