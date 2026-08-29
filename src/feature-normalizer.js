/**
 * Fit a language-neutral feature transform over reference templates and the
 * target recording. The transform is deliberately opt-in because removing
 * global MFCC scale/offset can also remove useful singer or instrument cues.
 */
export function fitFeatureNormalization(frameGroups, options = {}) {
  const mode = options.mode === "global-zscore" ? "global-zscore" : "none";
  const groups = Array.isArray(frameGroups) ? frameGroups : [];
  const frames = groups.flatMap((group) => Array.isArray(group) ? group : []);
  const dimensions = frames.reduce((largest, frame) => Math.max(largest, Array.isArray(frame) ? frame.length : 0), 0);
  const epsilon = Number.isFinite(options.epsilon) && options.epsilon > 0 ? options.epsilon : 1e-6;
  if (mode === "none" || !frames.length || !dimensions) return { mode: "none", dimensions, epsilon, means: [], scales: [] };
  const means = Array.from({ length: dimensions }, () => 0);
  for (const frame of frames) for (let index = 0; index < dimensions; index++) means[index] += Number(frame[index] || 0);
  for (let index = 0; index < dimensions; index++) means[index] /= frames.length;
  const variances = Array.from({ length: dimensions }, () => 0);
  for (const frame of frames) for (let index = 0; index < dimensions; index++) variances[index] += (Number(frame[index] || 0) - means[index]) ** 2;
  const scales = variances.map((variance) => Math.max(epsilon, Math.sqrt(variance / frames.length)));
  return { mode, dimensions, epsilon, means, scales };
}

export function transformFeatureFrames(frames, normalization) {
  if (!Array.isArray(frames)) return [];
  if (!normalization || normalization.mode !== "global-zscore") return frames.map((frame) => Array.from(frame || [], Number));
  return frames.map((frame) => Array.from({ length: normalization.dimensions }, (_, index) => (Number(frame?.[index] || 0) - normalization.means[index]) / normalization.scales[index]));
}
