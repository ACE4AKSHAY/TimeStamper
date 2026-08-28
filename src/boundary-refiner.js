import { normalizeProfile } from "./profile-fusion.js";

function onsetStrength(profile, index) {
  return index <= 0 ? profile[0] : Math.max(0, profile[index] - profile[index - 1]);
}

function scoreBoundary(profile, position, original, windowFrames, options) {
  const before = position > 0 ? profile[position - 1] : profile[position];
  const after = profile[position];
  const rise = Math.max(0, after - before);
  const localPeak = Math.max(0, after - Math.min(before, profile[Math.min(profile.length - 1, position + 1)]));
  const movement = windowFrames ? Math.abs(position - original) / windowFrames : 0;
  return (options.onsetWeight * onsetStrength(profile, position)) + (options.peakWeight * localPeak) - (options.movementWeight * movement);
}

/**
 * Refine an existing monotonic segmentation by searching a bounded frame
 * neighborhood around each internal boundary. The global solution remains the
 * coarse input; this pass only makes local, explainable onset corrections.
 */
export function refineBoundarySegments(segments, profile, duration, options = {}) {
  if (!Array.isArray(segments) || !segments.length || !Array.isArray(profile) || !profile.length || !Number.isFinite(duration) || duration <= 0) throw new Error("Boundary refinement requires segments, a non-empty profile, and a positive duration.");
  const activity = normalizeProfile(profile);
  const frameCount = activity.length;
  const windowFrames = Math.max(0, Math.floor(options.windowFrames ?? 4));
  const minGap = Math.max(1, Math.floor(options.minGap ?? 1));
  const scoreOptions = {
    onsetWeight: Number.isFinite(options.onsetWeight) ? Math.max(0, options.onsetWeight) : 1,
    peakWeight: Number.isFinite(options.peakWeight) ? Math.max(0, options.peakWeight) : 0.25,
    movementWeight: Number.isFinite(options.movementWeight) ? Math.max(0, options.movementWeight) : 0.05,
  };
  const confidenceScale = Number.isFinite(options.confidenceScale) && options.confidenceScale > 0 ? options.confidenceScale : 0.25;
  const boundaries = [0];
  const decisions = [];
  for (let index = 1; index < segments.length; index++) {
    const original = Math.round(Number(segments[index].startFrame));
    const next = Math.round(Number(segments[index + 1]?.startFrame ?? frameCount));
    const lower = Math.max(boundaries[index - 1] + minGap, original - windowFrames);
    const upper = Math.min(next - minGap, original + windowFrames, frameCount - (segments.length - index) * minGap);
    const candidates = [];
    for (let position = lower; position <= upper; position++) candidates.push({ position, score: scoreBoundary(activity, position, original, windowFrames, scoreOptions) });
    if (!candidates.length) throw new Error("Boundary refinement could not preserve the requested minimum line duration.");
    candidates.sort((a, b) => b.score - a.score || a.position - b.position);
    const best = candidates[0];
    const second = candidates[1]?.score ?? best.score;
    boundaries.push(best.position);
    decisions.push({ boundaryIndex: index, originalFrame: original, refinedFrame: best.position, shiftFrames: best.position - original, score: best.score, margin: best.score - second, confidence: Math.max(0, Math.min(1, (best.score - second) / confidenceScale)) });
  }
  boundaries.push(frameCount);
  const refinedSegments = segments.map((segment, index) => ({ ...segment, startFrame: boundaries[index], endFrame: boundaries[index + 1], startTime: boundaries[index] / frameCount * duration, endTime: boundaries[index + 1] / frameCount * duration, refinement: decisions[index - 1] || null }));
  return { segments: refinedSegments, boundaries, decisions, frameRate: frameCount / duration, windowFrames, minGap, ...scoreOptions, method: "local_boundary_refinement" };
}
