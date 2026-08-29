import { constrainedDtw } from "./dtw.js";

function candidateCost(audioFrames, template, start, end, window) {
  return constrainedDtw(template, audioFrames.slice(start, end), { window }).normalizedCost;
}

function safeCandidateCost(audioFrames, template, start, end, window) {
  try { return candidateCost(audioFrames, template, start, end, window); } catch { return Infinity; }
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
  const searchStride = Math.max(1, Math.floor(options.searchStride ?? 1));
  const expectedLengths = options.expectedLengths == null ? null : options.expectedLengths.map(Number);
  if (expectedLengths && (expectedLengths.length !== lineCount || expectedLengths.some((value) => !Number.isFinite(value) || value <= 0))) throw new Error("Expected template lengths must contain one positive value per lyric line.");
  const lengthTolerance = Math.min(10, Math.max(0, Number.isFinite(options.lengthTolerance) ? options.lengthTolerance : 0.75));
  const lineMinLengths = lineTemplates.map((template, index) => expectedLengths ? Math.max(minLength, Math.floor(expectedLengths[index] * Math.max(0.01, 1 - lengthTolerance))) : minLength);
  const lineMaxLengths = lineTemplates.map((template, index) => expectedLengths ? Math.max(lineMinLengths[index], Math.min(maxLength, Math.ceil(expectedLengths[index] * (1 + lengthTolerance)))) : maxLength);
  const prefixMinimums = [0];
  for (let index = 0; index < lineCount; index++) prefixMinimums.push(prefixMinimums[index] + lineMinLengths[index]);
  const initialFrame = Math.min(frameCount - 1, Math.max(0, Math.floor(options.initialFrame ?? 0)));
  const costs = Array.from({ length: lineCount + 1 }, () => new Float64Array(frameCount + 1).fill(Infinity)); const parents = Array.from({ length: lineCount + 1 }, () => new Int32Array(frameCount + 1).fill(-1)); costs[0][initialFrame] = 0;
  for (let line = 1; line <= lineCount; line++) {
    const minimumEnd = Math.max(initialFrame + prefixMinimums[line], line * minLength);
    for (let end = minimumEnd; end <= frameCount; end++) {
      if (end !== frameCount && end % searchStride !== 0) continue;
      const firstStart = Math.max(initialFrame + prefixMinimums[line - 1], end - lineMaxLengths[line - 1]);
      const lastStart = end - lineMinLengths[line - 1];
      for (let start = firstStart; start <= lastStart; start++) {
        if (start !== initialFrame && start % searchStride !== 0) continue;
        if (!Number.isFinite(costs[line - 1][start])) continue;
        const cost = costs[line - 1][start] + candidateCost(audioFrames, lineTemplates[line - 1], start, end, window);
        if (cost < costs[line][end]) { costs[line][end] = cost; parents[line][end] = start; }
      }
    }
  }
  if (!Number.isFinite(costs[lineCount][frameCount])) throw new Error("No template alignment path satisfies the line-duration constraints.");
  let segments = []; let end = frameCount;
  for (let line = lineCount; line > 0; line--) { const start = parents[line][end]; segments.push({ lineIndex: line - 1, startFrame: start, endFrame: end, startTime: start / frameRate, endTime: end / frameRate, cost: costs[line][end] - costs[line - 1][start] }); end = start; }
  segments.reverse();
  // DTW costs are only comparable within one alignment because their absolute
  // scale depends on recording level and MFCC settings. Normalize each line
  // against the median selected-line cost to expose an explainable relative
  // confidence, rather than pretending it is a calibrated probability.
  const selectedCosts = segments.map((segment) => Math.max(0, segment.cost));
  const orderedCosts = [...selectedCosts].sort((a, b) => a - b);
  const middle = Math.floor(orderedCosts.length / 2);
  const medianCost = orderedCosts.length % 2 ? orderedCosts[middle] : (orderedCosts[middle - 1] + orderedCosts[middle]) / 2;
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
      const alternative = safeCandidateCost(audioFrames, lineTemplates[index], left.startFrame, boundary, window)
        + safeCandidateCost(audioFrames, lineTemplates[index + 1], boundary, right.endFrame, window);
      bestAlternative = Math.min(bestAlternative, alternative);
    }
    const margin = Number.isFinite(bestAlternative) ? Math.max(0, bestAlternative - chosenCost) : null;
    const marginRatio = margin === null ? null : margin / Math.max(Math.abs(chosenCost), 1e-9);
    return { boundaryIndex: index, marginCost: margin, marginRatio, stable: marginRatio === null ? null : marginRatio >= boundaryMarginThreshold };
  });
  const boundaryByLine = new Map();
  for (const boundary of boundaryDiagnostics) { boundaryByLine.set(boundary.boundaryIndex, { endBoundary: boundary }); boundaryByLine.set(boundary.boundaryIndex + 1, { ...(boundaryByLine.get(boundary.boundaryIndex + 1) || {}), startBoundary: boundary }); }
  const diagnostics = segments.map((segment, index) => {
    const cost = selectedCosts[index];
    const relativeCost = cost / baseline;
    const confidence = Math.min(1, baseline / Math.max(cost, 1e-9));
    const boundary = boundaryByLine.get(index) || {};
    const unstableBoundary = boundary.startBoundary?.stable === false || boundary.endBoundary?.stable === false;
    return { lineIndex: segment.lineIndex, cost, relativeCost, confidence, reviewRequired: confidence < reviewThreshold || unstableBoundary, startBoundary: boundary.startBoundary || null, endBoundary: boundary.endBoundary || null };
  });
  segments = segments.map((segment, index) => ({ ...segment, ...diagnostics[index] }));
  return { segments, cost: costs[lineCount][frameCount], frameRate, method: "template_mfcc_dtw", diagnostics: { medianCost, baseline, reviewThreshold, marginFrames, boundaryMarginThreshold, searchStride, initialFrame, expectedLengths, lengthTolerance, boundaries: boundaryDiagnostics } };
}
