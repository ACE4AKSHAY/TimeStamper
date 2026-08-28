import { normalizeProfile } from "./profile-fusion.js";

function average(values, start, end) {
  const first = Math.max(0, start), last = Math.min(values.length, end);
  if (first >= last) return values[Math.min(values.length - 1, Math.max(0, start))] || 0;
  return values.slice(first, last).reduce((sum, value) => sum + value, 0) / (last - first);
}

function boundaryEvidence(profile, position, options) {
  const before = average(profile, position - options.pauseWindow, position);
  const after = average(profile, position, position + options.pauseWindow);
  const followingPeak = Math.max(...profile.slice(position, Math.min(profile.length, position + options.lookahead)), 0);
  const onset = Math.max(0, after - before);
  const quietGap = 1 - Math.min(before, after);
  return options.onsetWeight * onset + options.silenceWeight * quietGap + options.followingWeight * followingPeak;
}

/**
 * Choose monotonic lyric boundaries using duration, onset, and pause evidence.
 * Quiet gaps are only useful when followed by activity, avoiding arbitrary
 * placement in a long silent region.
 */
export function alignBySilenceAwareBoundaryDp(lines, profile, duration, options = {}) {
  if (!Array.isArray(lines) || !lines.length || !Array.isArray(profile) || !profile.length || !Number.isFinite(duration) || duration <= 0) throw new Error("Silence-aware Boundary DP requires lyric lines, a non-empty profile, and a positive duration.");
  const activity = normalizeProfile(profile), lineCount = lines.length, frameCount = activity.length, expectedLength = frameCount / lineCount;
  const minLength = Math.max(1, Math.floor(options.minLength || expectedLength * 0.35));
  const maxLength = Math.max(minLength, Math.ceil(options.maxLength || expectedLength * 1.9));
  const durationWeight = Number.isFinite(options.durationWeight) ? Math.max(0, options.durationWeight) : 1;
  const boundaryWeight = Number.isFinite(options.boundaryWeight) ? Math.max(0, options.boundaryWeight) : 0.8;
  const scoreOptions = { pauseWindow: Math.max(1, Math.floor(options.pauseWindow || 2)), lookahead: Math.max(1, Math.floor(options.lookahead || 3)), onsetWeight: Number.isFinite(options.onsetWeight) ? Math.max(0, options.onsetWeight) : 1, silenceWeight: Number.isFinite(options.silenceWeight) ? Math.max(0, options.silenceWeight) : 0.35, followingWeight: Number.isFinite(options.followingWeight) ? Math.max(0, options.followingWeight) : 0.65 };
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
        const lengthPenalty = Math.abs(end - start - expectedLength) / Math.max(1, expectedLength);
        const evidence = line === 1 ? 0 : boundaryEvidence(activity, start, scoreOptions);
        const cost = costs[line - 1][start] + durationWeight * lengthPenalty - boundaryWeight * evidence;
        if (cost < costs[line][end]) { costs[line][end] = cost; parents[line][end] = start; }
      }
    }
  }
  if (!Number.isFinite(costs[lineCount][frameCount])) throw new Error("No silence-aware Boundary-DP path satisfies the line-duration constraints.");
  const segments = [];
  let end = frameCount;
  for (let line = lineCount; line > 0; line--) { const start = parents[line][end]; segments.push({ lineIndex: line - 1, startFrame: start, endFrame: end, startTime: start / frameCount * duration, endTime: end / frameCount * duration, cost: costs[line][end] - costs[line - 1][start] }); end = start; }
  segments.reverse();
  return { segments, cost: costs[lineCount][frameCount], frameRate: frameCount / duration, expectedLength, minLength, maxLength, durationWeight, boundaryWeight, ...scoreOptions, method: "silence_aware_boundary_dynamic_programming" };
}
