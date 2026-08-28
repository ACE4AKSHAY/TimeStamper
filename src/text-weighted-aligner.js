import { normalizeProfile } from "./profile-fusion.js";

function lineText(line) {
  if (typeof line === "string") return line;
  return line?.normalizedText ?? line?.originalText ?? line?.text ?? "";
}

/**
 * Estimate relative vocal duration from the amount of lyric text. Unicode
 * code points are counted after whitespace removal, so native scripts work
 * without a language model or language-specific tokenizer.
 */
export function estimateTextWeights(lines, options = {}) {
  if (!Array.isArray(lines) || !lines.length) throw new Error("Text weighting requires at least one lyric line.");
  const exponent = Number.isFinite(options.exponent) && options.exponent > 0 ? options.exponent : 1;
  const minimumWeight = Number.isFinite(options.minimumWeight) && options.minimumWeight > 0 ? options.minimumWeight : 1;
  const textLengths = lines.map((line) => Array.from(String(lineText(line)).normalize("NFC")).filter((character) => !/\s/u.test(character)).length);
  const safeLengths = textLengths.map((length) => Math.max(minimumWeight, length));
  const weights = safeLengths.map((length) => length ** exponent);
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  return { textLengths, weights, totalWeight, exponent, minimumWeight };
}

function onsetStrength(profile, index) {
  return index === 0 ? profile[0] : Math.max(0, profile[index] - profile[index - 1]);
}

function segmentCost(profile, start, end, expectedLength, durationWeight, boundaryWeight, lineIndex) {
  const lengthPenalty = Math.abs(end - start - expectedLength) / Math.max(1, expectedLength);
  const boundaryReward = lineIndex === 0 ? 0 : onsetStrength(profile, start);
  return durationWeight * lengthPenalty - boundaryWeight * boundaryReward;
}

/**
 * Boundary-DP variant that replaces the equal-line duration prior with a
 * deterministic text-length prior. It remains monotonic, explainable and
 * editable; it does not infer words from audio or use machine learning.
 */
export function alignByTextWeightedBoundaryDp(lines, profile, duration, options = {}) {
  if (!Array.isArray(lines) || !lines.length || !Array.isArray(profile) || !profile.length || !Number.isFinite(duration) || duration <= 0) throw new Error("Text-weighted Boundary DP requires lyric lines, a non-empty profile, and a positive duration.");
  const activity = normalizeProfile(profile);
  const lineCount = lines.length;
  const frameCount = activity.length;
  const text = estimateTextWeights(lines, options);
  const expectedLengths = text.weights.map((weight) => frameCount * weight / text.totalWeight);
  const meanExpectedLength = frameCount / lineCount;
  const minLength = Math.max(1, Math.floor(options.minLength || meanExpectedLength * 0.35));
  const maxLength = Math.max(minLength, Math.ceil(options.maxLength || meanExpectedLength * 1.9));
  const durationWeight = Number.isFinite(options.durationWeight) ? Math.max(0, options.durationWeight) : 1;
  const boundaryWeight = Number.isFinite(options.boundaryWeight) ? Math.max(0, options.boundaryWeight) : 0.8;
  const costs = Array.from({ length: lineCount + 1 }, () => new Float64Array(frameCount + 1).fill(Infinity));
  const parents = Array.from({ length: lineCount + 1 }, () => new Int32Array(frameCount + 1).fill(-1));
  costs[0][0] = 0;
  for (let line = 1; line <= lineCount; line++) {
    const minimumEnd = line * minLength;
    const maximumEnd = Math.min(frameCount - (lineCount - line) * minLength, line * maxLength);
    for (let end = minimumEnd; end <= maximumEnd; end++) {
      const minimumStart = line === 1 ? 0 : Math.max((line - 1) * minLength, end - maxLength);
      const maximumStart = line === 1 ? 0 : end - minLength;
      for (let start = minimumStart; start <= maximumStart; start++) {
        if (!Number.isFinite(costs[line - 1][start])) continue;
        const cost = costs[line - 1][start] + segmentCost(activity, start, end, expectedLengths[line - 1], durationWeight, boundaryWeight, line - 1);
        if (cost < costs[line][end]) { costs[line][end] = cost; parents[line][end] = start; }
      }
    }
  }
  if (!Number.isFinite(costs[lineCount][frameCount])) throw new Error("No text-weighted Boundary-DP path satisfies the line-duration constraints.");
  const segments = [];
  let end = frameCount;
  for (let line = lineCount; line > 0; line--) {
    const start = parents[line][end];
    segments.push({ lineIndex: line - 1, startFrame: start, endFrame: end, startTime: start / frameCount * duration, endTime: end / frameCount * duration, expectedLength: expectedLengths[line - 1], cost: costs[line][end] - costs[line - 1][start] });
    end = start;
  }
  segments.reverse();
  return { segments, cost: costs[lineCount][frameCount], frameRate: frameCount / duration, expectedLengths, textLengths: text.textLengths, textWeights: text.weights, exponent: text.exponent, minimumWeight: text.minimumWeight, minLength, maxLength, durationWeight, boundaryWeight, method: "text_weighted_boundary_dynamic_programming" };
}
