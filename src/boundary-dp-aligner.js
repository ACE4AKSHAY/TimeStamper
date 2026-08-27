import { normalizeProfile } from "./profile-fusion.js";

function onsetStrength(profile, index) {
  return index === 0 ? profile[0] : Math.max(0, profile[index] - profile[index - 1]);
}

function segmentCost(profile, start, end, expectedLength, durationWeight, boundaryWeight, lineIndex) {
  const lengthPenalty = Math.abs(end - start - expectedLength) / expectedLength;
  const boundaryReward = lineIndex === 0 ? 0 : onsetStrength(profile, start);
  return durationWeight * lengthPenalty - boundaryWeight * boundaryReward;
}

/**
 * Choose monotonic lyric boundaries with explicit duration and onset costs.
 * This is a deterministic dynamic-programming heuristic, not a learned model.
 */
export function alignByBoundaryDp(lines, profile, duration, options = {}) {
  if (!Array.isArray(lines) || !lines.length || !Array.isArray(profile) || !profile.length || !Number.isFinite(duration) || duration <= 0) throw new Error("Boundary DP requires lyric lines, a non-empty profile, and a positive duration.");
  const activity = normalizeProfile(profile), lineCount = lines.length, frameCount = activity.length, expectedLength = frameCount / lineCount;
  const minLength = Math.max(1, Math.floor(options.minLength || expectedLength * 0.35));
  const maxLength = Math.max(minLength, Math.ceil(options.maxLength || expectedLength * 1.9));
  const durationWeight = Number.isFinite(options.durationWeight) ? Math.max(0, options.durationWeight) : 1;
  const boundaryWeight = Number.isFinite(options.boundaryWeight) ? Math.max(0, options.boundaryWeight) : 0.8;
  const costs = Array.from({ length: lineCount + 1 }, () => new Float64Array(frameCount + 1).fill(Infinity));
  const parents = Array.from({ length: lineCount + 1 }, () => new Int32Array(frameCount + 1).fill(-1));
  costs[0][0] = 0;
  for (let line = 1; line <= lineCount; line++) {
    const minimumEnd = line * minLength, maximumEnd = Math.min(frameCount - (lineCount - line) * minLength, line * maxLength);
    for (let end = minimumEnd; end <= maximumEnd; end++) {
      const minimumStart = line === 1 ? 0 : Math.max((line - 1) * minLength, end - maxLength);
      const maximumStart = line === 1 ? 0 : end - minLength;
      for (let start = minimumStart; start <= maximumStart; start++) {
        if (!Number.isFinite(costs[line - 1][start])) continue;
        const cost = costs[line - 1][start] + segmentCost(activity, start, end, expectedLength, durationWeight, boundaryWeight, line - 1);
        if (cost < costs[line][end]) { costs[line][end] = cost; parents[line][end] = start; }
      }
    }
  }
  if (!Number.isFinite(costs[lineCount][frameCount])) throw new Error("No boundary-DP path satisfies the line-duration constraints.");
  const segments = []; let end = frameCount;
  for (let line = lineCount; line > 0; line--) { const start = parents[line][end]; segments.push({ lineIndex: line - 1, startFrame: start, endFrame: end, startTime: start / frameCount * duration, endTime: end / frameCount * duration, cost: costs[line][end] - costs[line - 1][start] }); end = start; }
  segments.reverse();
  return { segments, cost: costs[lineCount][frameCount], frameRate: frameCount / duration, expectedLength, minLength, maxLength, durationWeight, boundaryWeight, method: "boundary_dynamic_programming" };
}
