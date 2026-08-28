import { alignByBoundaryDp } from "./boundary-dp-aligner.js";
import { normalizeProfile } from "./profile-fusion.js";

/**
 * Boundary-DP variant that estimates a leading low-activity intro before
 * solving line boundaries. It remains deterministic and explainable: the
 * intro detector only searches for the first sustained profile threshold,
 * then delegates the actual segmentation to the existing Boundary-DP solver.
 */
export function alignByIntroAwareBoundaryDp(lines, profile, duration, options = {}) {
  if (!Array.isArray(profile) || !profile.length) throw new Error("Intro-aware boundary DP requires a non-empty profile.");
  const activity = normalizeProfile(profile);
  const threshold = Number.isFinite(options.introThreshold) ? Math.min(1, Math.max(0, options.introThreshold)) : 0.35;
  const sustainFrames = Math.max(1, Math.floor(options.introSustainFrames || 1));
  const introFrame = findActiveStart(activity, threshold, sustainFrames);
  const sliced = profile.slice(introFrame);
  const local = alignByBoundaryDp(lines, sliced, duration * (sliced.length / profile.length), options);
  const frameCount = profile.length;
  const segments = local.segments.map((segment) => ({
    ...segment,
    startFrame: segment.startFrame + introFrame,
    endFrame: segment.endFrame + introFrame,
    startTime: (segment.startFrame + introFrame) / frameCount * duration,
    endTime: (segment.endFrame + introFrame) / frameCount * duration,
  }));
  return {
    ...local,
    segments,
    introFrame,
    introTime: introFrame / frameCount * duration,
    threshold,
    sustainFrames,
    frameRate: frameCount / duration,
    method: "intro_aware_boundary_dynamic_programming",
  };
}

function findActiveStart(activity, threshold, sustainFrames) {
  const lastStart = Math.max(0, activity.length - sustainFrames);
  for (let index = 0; index <= lastStart; index++) {
    let sustained = true;
    for (let offset = 0; offset < sustainFrames; offset++) {
      if (activity[index + offset] < threshold) {
        sustained = false;
        break;
      }
    }
    if (sustained) return index;
  }
  return 0;
}
