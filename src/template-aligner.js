import { constrainedDtw } from "./dtw.js";

function candidateCost(audioFrames, template, start, end, window) {
  return constrainedDtw(template, audioFrames.slice(start, end), { window }).normalizedCost;
}

/**
 * Monotonic dynamic-programming segmentation using one acoustic feature
 * template per known lyric line. Templates are intentionally explicit: they
 * can come from an aligned reference, a vocal recording, or a future model.
 * Text alone cannot be passed to DTW and magically become an audio signal.
 */
export function alignLineTemplates(audioFrames, lineTemplates, options = {}) {
  if (!Array.isArray(audioFrames) || !audioFrames.length || !Array.isArray(lineTemplates) || !lineTemplates.length) throw new Error("Template alignment requires audio frames and at least one line template.");
  const frameRate = options.frameRate || 1, minLength = Math.max(1, options.minLength || 1), slack = Math.max(0, options.slack ?? 2), largestTemplate = lineTemplates.reduce((largest, template) => Math.max(largest, template.length), 0), maxLength = options.maxLength || Math.max(minLength, largestTemplate + slack), window = options.window;
  const lineCount = lineTemplates.length, frameCount = audioFrames.length;
  const costs = Array.from({ length: lineCount + 1 }, () => new Float64Array(frameCount + 1).fill(Infinity)); const parents = Array.from({ length: lineCount + 1 }, () => new Int32Array(frameCount + 1).fill(-1)); costs[0][0] = 0;
  for (let line = 1; line <= lineCount; line++) {
    for (let end = line * minLength; end <= frameCount; end++) {
      const firstStart = Math.max((line - 1) * minLength, end - maxLength);
      const lastStart = end - minLength;
      for (let start = firstStart; start <= lastStart; start++) {
        if (!Number.isFinite(costs[line - 1][start])) continue;
        const cost = costs[line - 1][start] + candidateCost(audioFrames, lineTemplates[line - 1], start, end, window);
        if (cost < costs[line][end]) { costs[line][end] = cost; parents[line][end] = start; }
      }
    }
  }
  if (!Number.isFinite(costs[lineCount][frameCount])) throw new Error("No template alignment path satisfies the line-duration constraints.");
  const segments = []; let end = frameCount;
  for (let line = lineCount; line > 0; line--) { const start = parents[line][end]; segments.push({ lineIndex: line - 1, startFrame: start, endFrame: end, startTime: start / frameRate, endTime: end / frameRate, cost: costs[line][end] - costs[line - 1][start] }); end = start; }
  segments.reverse();
  return { segments, cost: costs[lineCount][frameCount], frameRate, method: "template_mfcc_dtw" };
}
