import { constrainedDtw } from "./dtw.js";

function candidateCost(audioFrames, template, start, end, window, featureStride = 1) {
  const segment = featureStride === 1 ? audioFrames.slice(start, end) : audioFrames.slice(start, end).filter((_, index) => index % featureStride === 0);
  return constrainedDtw(template, segment, { window }).normalizedCost;
}

function safeCandidateCost(audioFrames, template, start, end, window, featureStride = 1) {
  try { return candidateCost(audioFrames, template, start, end, window, featureStride); } catch { return Infinity; }
}

function meanVector(frames, dimensions) {
  const mean = new Float64Array(dimensions);
  if (!frames.length) return mean;
  for (const frame of frames) for (let index = 0; index < dimensions; index++) mean[index] += Number(frame[index] || 0);
  for (let index = 0; index < dimensions; index++) mean[index] /= frames.length;
  return mean;
}

function createPrefixSums(frames, dimensions) {
  const prefixes = Array.from({ length: dimensions }, () => new Float64Array(frames.length + 1));
  for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) for (let dimension = 0; dimension < dimensions; dimension++) prefixes[dimension][frameIndex + 1] = prefixes[dimension][frameIndex] + Number(frames[frameIndex][dimension] || 0);
  return prefixes;
}

function segmentMean(prefixes, start, end) {
  const count = Math.max(1, end - start), mean = new Float64Array(prefixes.length);
  for (let dimension = 0; dimension < prefixes.length; dimension++) mean[dimension] = (prefixes[dimension][end] - prefixes[dimension][start]) / count;
  return mean;
}

function descriptorDistance(left, right) {
  let sum = 0;
  for (let index = 0; index < left.length; index++) sum += (left[index] - right[index]) ** 2;
  return Math.sqrt(sum / Math.max(1, left.length));
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
  const featureStride = Math.max(1, Math.floor(options.featureStride ?? 1));
  const searchTemplates = featureStride === 1 ? lineTemplates : lineTemplates.map((template) => template.filter((_, index) => index % featureStride === 0));
  const dtwWindow = Number.isFinite(window) && featureStride > 1 ? Math.max(1, Math.ceil(window / featureStride)) : window;
  const descriptorTopK = Math.max(0, Math.floor(options.descriptorTopK ?? 0));
  const descriptorDimensions = Math.max(1, Math.floor(options.descriptorDimensions ?? Math.min(6, searchTemplates[0][0]?.length || 1)));
  const descriptorMeans = descriptorTopK ? searchTemplates.map((template) => meanVector(template, descriptorDimensions)) : null;
  const descriptorPrefixes = descriptorTopK ? createPrefixSums(audioFrames, descriptorDimensions) : null;
  const expectedLengths = options.expectedLengths == null ? null : options.expectedLengths.map(Number);
  if (expectedLengths && (expectedLengths.length !== lineCount || expectedLengths.some((value) => !Number.isFinite(value) || value <= 0))) throw new Error("Expected template lengths must contain one positive value per lyric line.");
  const lengthTolerance = Math.min(10, Math.max(0, Number.isFinite(options.lengthTolerance) ? options.lengthTolerance : 0.75));
  const lineMinLengths = lineTemplates.map((template, index) => expectedLengths ? Math.max(minLength, Math.floor(expectedLengths[index] * Math.max(0.01, 1 - lengthTolerance))) : minLength);
  const lineMaxLengths = lineTemplates.map((template, index) => expectedLengths ? Math.max(lineMinLengths[index], Math.min(maxLength, Math.ceil(expectedLengths[index] * (1 + lengthTolerance)))) : maxLength);
  const prefixMinimums = [0];
  for (let index = 0; index < lineCount; index++) prefixMinimums.push(prefixMinimums[index] + lineMinLengths[index]);
  const initialFrame = Math.min(frameCount - 1, Math.max(0, Math.floor(options.initialFrame ?? 0)));
  const expectedStarts = options.expectedStarts == null ? null : options.expectedStarts.map(Number);
  if (expectedStarts && (expectedStarts.length !== lineCount || expectedStarts.some((value) => !Number.isFinite(value) || value < 0 || value >= frameCount))) throw new Error("Expected template starts must contain one in-range frame per lyric line.");
  const anchorToleranceFrames = Math.max(0, Math.floor(options.anchorToleranceFrames ?? Infinity));
  const costs = Array.from({ length: lineCount + 1 }, () => new Float64Array(frameCount + 1).fill(Infinity)); const parents = Array.from({ length: lineCount + 1 }, () => new Int32Array(frameCount + 1).fill(-1)); costs[0][initialFrame] = 0;
  for (let line = 1; line <= lineCount; line++) {
    const expectedEnd = expectedStarts ? expectedStarts[line - 1] + expectedLengths[line - 1] : null;
    const minimumEnd = Math.max(initialFrame + prefixMinimums[line], line * minLength, expectedEnd === null ? 0 : Math.floor(expectedEnd - anchorToleranceFrames));
    const maximumEnd = line === lineCount ? frameCount : Math.min(frameCount, expectedEnd === null ? frameCount : Math.ceil(expectedEnd + anchorToleranceFrames));
    for (let end = minimumEnd; end <= maximumEnd; end++) {
      if (end !== frameCount && end % searchStride !== 0) continue;
      const firstStart = Math.max(initialFrame + prefixMinimums[line - 1], end - lineMaxLengths[line - 1]);
      const expectedStart = expectedStarts ? expectedStarts[line - 1] : null;
      const lastStart = Math.min(end - lineMinLengths[line - 1], expectedStart === null ? end - lineMinLengths[line - 1] : Math.floor(expectedStart + anchorToleranceFrames));
      const boundedFirstStart = expectedStart === null ? firstStart : Math.max(firstStart, Math.ceil(expectedStart - anchorToleranceFrames));
      const candidates = [];
      for (let start = boundedFirstStart; start <= lastStart; start++) {
        if (start !== initialFrame && start % searchStride !== 0) continue;
        if (!Number.isFinite(costs[line - 1][start])) continue;
        const descriptor = descriptorTopK ? descriptorDistance(descriptorMeans[line - 1], segmentMean(descriptorPrefixes, start, end)) : 0;
        candidates.push({ start, descriptor });
      }
      if (descriptorTopK && candidates.length > descriptorTopK) candidates.sort((left, right) => left.descriptor - right.descriptor);
      for (const candidate of descriptorTopK ? candidates.slice(0, descriptorTopK) : candidates) {
        const start = candidate.start;
        const cost = costs[line - 1][start] + candidateCost(audioFrames, searchTemplates[line - 1], start, end, dtwWindow, featureStride);
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
      const alternative = safeCandidateCost(audioFrames, searchTemplates[index], left.startFrame, boundary, dtwWindow, featureStride)
        + safeCandidateCost(audioFrames, searchTemplates[index + 1], boundary, right.endFrame, dtwWindow, featureStride);
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
  return { segments, cost: costs[lineCount][frameCount], frameRate, method: "template_mfcc_dtw", diagnostics: { medianCost, baseline, reviewThreshold, marginFrames, boundaryMarginThreshold, searchStride, featureStride, dtwWindow, descriptorTopK, descriptorDimensions, initialFrame, expectedStarts, anchorToleranceFrames, expectedLengths, lengthTolerance, boundaries: boundaryDiagnostics } };
}
