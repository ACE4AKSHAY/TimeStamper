import { normalizeProfile, resampleProfile } from "./profile-fusion.js";

export const RETIME_LRC_VERSION = "0.1.0";

/**
 * Retimes an existing line-timed LRC against deterministic audio profiles.
 * This is deliberately a signal-processing heuristic, not a language model:
 * it estimates an offset, bounded tempo drift and local onset corrections.
 */
export function retimeLrc({ lines = [], timedLyrics, duration, profiles = {}, options = {} } = {}) {
  const signal = options.signal;
  const sourceLines = timedLyrics?.timedLines?.length ? timedLyrics.timedLines : lines;
  const normalizedLines = sourceLines.map((line, index) => ({
    id: line.id || `line-${index}`,
    text: line.text ?? line.originalText ?? "",
    startTime: line.startTime,
    endTime: line.endTime ?? null,
    words: line.words,
  }));
  const starts = normalizedLines.filter((line) => Number.isFinite(line.startTime));
  const base = {
    engine: "retime-lrc",
    engineVersion: RETIME_LRC_VERSION,
    parameters: {
      maxOffsetSeconds: options.maxOffsetSeconds ?? 15,
      minDrift: options.minDrift ?? 0.97,
      maxDrift: options.maxDrift ?? 1.03,
      localWindowSeconds: options.localWindowSeconds ?? 0.6,
      minGapSeconds: options.minGapSeconds ?? 0.03,
    },
  };

  if (starts.length < 2) return refusal(base, normalizedLines, "too few timed lines to estimate an offset or drift");
  const totalDuration = Number.isFinite(duration) && duration > 0 ? duration : inferDuration(normalizedLines);
  if (!totalDuration) return refusal(base, normalizedLines, "audio duration is missing");
  const onsetResult = buildOnsetProfile(profiles, options.profileBins || 1200);
  if (onsetResult.refusal) return refusal(base, normalizedLines, onsetResult.refusal, onsetResult.diagnostics);
  checkAbort(signal);

  const step = Math.max(totalDuration / Math.max(1, onsetResult.profile.length - 1), 0.02);
  const offset = searchGlobalOffset(
    starts.map((line) => line.startTime),
    onsetResult.profile,
    totalDuration,
    {
      maxOffsetSeconds: options.maxOffsetSeconds ?? 15,
      step,
      signal,
      onProgress: options.onProgress,
    },
  );
  const initialPairs = matchStarts(
    starts.map((line) => line.startTime),
    onsetResult.profile,
    totalDuration,
    offset,
    {
      windowSeconds: options.matchWindowSeconds ?? 0.8,
    },
  );
  if (initialPairs.length < 2) return refusal(base, normalizedLines, "too few onset matches", { offset });
  const fit = fitAffine(initialPairs, options);
  if (fit.inlierRatio < (options.minimumInlierRatio ?? 0.5)) {
    return refusal(base, normalizedLines, "too few reliable onset inliers", { offset, ...fit });
  }

  const refined = normalizedLines.map((line, index) => {
    const sourceStart = Number.isFinite(line.startTime) ? line.startTime : null;
    if (sourceStart === null)
      return {
        ...line,
        startTime: null,
        endTime: null,
        confidence: 0,
        reviewRequired: true,
        reasons: ["line has no source timestamp"],
      };
    const predicted = fit.scale * sourceStart + fit.intercept;
    const snapped = snapToOnset(onsetResult.profile, totalDuration, predicted, options.localWindowSeconds ?? 0.6);
    const residual = Math.abs(snapped.time - predicted);
    const margin = onsetMargin(onsetResult.profile, snapped.index);
    const confidence = clamp(Math.exp(-residual / 0.45) * (0.55 + margin * 0.45) * fit.inlierRatio);
    const reasons = [];
    if (residual > 0.35) reasons.push("large local onset correction");
    if (margin < 0.15) reasons.push("weak onset margin");
    if (fit.inlierRatio < 0.8) reasons.push("robust fit excluded outliers");
    return {
      ...line,
      startTime: Math.max(0, snapped.time),
      endTime: null,
      confidence,
      reviewRequired: confidence < 0.65 || reasons.length > 0,
      reasons,
      alignmentMethod: "retime_lrc_offset_drift_onset",
      sourceStartTime: sourceStart,
    };
  });
  enforceMonotonicity(refined, totalDuration, options.minGapSeconds ?? 0.03);
  refined.forEach((line, index) => {
    line.endTime = refined[index + 1]?.startTime ?? null;
  });
  options.onProgress?.({ stage: "complete", fraction: 1 });
  return {
    ...base,
    lines: refined,
    confidence: clamp(fit.inlierRatio * Math.exp(-fit.residualMedian / 0.5)),
    reviewRequired: fit.inlierRatio < 0.8 || fit.residualMedian > 0.25,
    diagnostics: {
      ...onsetResult.diagnostics,
      globalOffset: offset,
      driftScale: fit.scale,
      intercept: fit.intercept,
      inlierRatio: fit.inlierRatio,
      residualMedian: fit.residualMedian,
      matchedLineCount: initialPairs.length,
      outlierLineCount: initialPairs.length - fit.inliers.length,
      refused: false,
    },
    parameters: { ...base.parameters, profileBins: onsetResult.profile.length },
  };
}

function buildOnsetProfile(profiles, bins) {
  const energy = numeric(profiles.energy);
  const flux = numeric(profiles.spectralFlux || profiles.flux || profiles.onset);
  const voicedness = numeric(profiles.voicedness);
  const available = [energy, flux, voicedness].filter((profile) => profile.length);
  if (!available.length) return { refusal: "audio profiles are missing", diagnostics: {} };
  const targetLength = Math.max(bins, ...available.map((profile) => profile.length));
  const energyProfile = energy.length
    ? normalizeProfile(resampleProfile(energy, targetLength))
    : Array(targetLength).fill(0);
  const fluxProfile = flux.length ? normalizeProfile(resampleProfile(flux, targetLength)) : Array(targetLength).fill(0);
  const voicedProfile = voicedness.length
    ? normalizeProfile(resampleProfile(voicedness, targetLength))
    : Array(targetLength).fill(1);
  const variation = standardDeviation(energyProfile) + standardDeviation(fluxProfile);
  if (variation < 1e-5)
    return { refusal: "audio profile is flat or silent", diagnostics: { profileBins: targetLength } };
  const voicedWeighted = energyProfile.reduce((sum, value, index) => sum + value * voicedProfile[index], 0);
  const energyTotal = energyProfile.reduce((sum, value) => sum + value, 0) || 1;
  const weightedVoicedness = voicedWeighted / energyTotal;
  if (voicedness.length && weightedVoicedness < 0.08) {
    return {
      refusal: "audio appears instrumental or has insufficient voicedness",
      diagnostics: { profileBins: targetLength, weightedVoicedness },
    };
  }
  const combined = normalizeProfile(
    energyProfile.map(
      (value, index) =>
        value * (voicedness.length ? 0.35 + voicedProfile[index] * 0.65 : 1) + fluxProfile[index] * 0.35,
    ),
  );
  return {
    profile: combined,
    diagnostics: { profileBins: targetLength, usedVoicedness: voicedness.length > 0, weightedVoicedness },
  };
}

function searchGlobalOffset(starts, profile, duration, { maxOffsetSeconds, step, signal, onProgress }) {
  let bestOffset = 0;
  let bestScore = -Infinity;
  const count = Math.floor((maxOffsetSeconds * 2) / step) + 1;
  for (let index = 0; index < count; index++) {
    checkAbort(signal);
    const offset = -maxOffsetSeconds + index * step;
    const score = impulseCorrelation(starts, profile, duration, offset);
    if (score > bestScore) {
      bestScore = score;
      bestOffset = offset;
    }
    if (index % Math.max(1, Math.floor(count / 20)) === 0)
      onProgress?.({ stage: "offset-search", fraction: index / count });
  }
  return bestOffset;
}

function impulseCorrelation(starts, profile, duration, offset) {
  const impulses = Array(profile.length).fill(0);
  const radius = Math.max(1, Math.round((profile.length / Math.max(duration, 1)) * 0.12));
  for (const start of starts) {
    const index = Math.round(((start + offset) / duration) * (profile.length - 1));
    if (index < 0 || index >= profile.length) continue;
    for (let delta = -radius; delta <= radius; delta++) {
      const target = index + delta;
      if (target >= 0 && target < impulses.length) impulses[target] += 1 - Math.abs(delta) / (radius + 1);
    }
  }
  return normalizedCorrelation(impulses, profile);
}

function matchStarts(starts, profile, duration, offset, { windowSeconds }) {
  return starts
    .map((source) => {
      const predicted = source + offset;
      const snap = snapToOnset(profile, duration, predicted, windowSeconds);
      return { source, observed: snap.time, strength: snap.strength };
    })
    .filter((pair) => pair.strength > 0.05);
}

function fitAffine(pairs, options) {
  let scale = 1;
  let intercept = median(pairs.map((pair) => pair.observed - pair.source));
  for (let iteration = 0; iteration < 5; iteration++) {
    const residuals = pairs.map((pair) => pair.observed - (scale * pair.source + intercept));
    const robustScale = Math.max(0.04, 1.4826 * median(residuals.map((value) => Math.abs(value))));
    const weighted = pairs.map((pair, index) => {
      const magnitude = Math.abs(residuals[index]);
      const limit = robustScale * 1.5;
      return { pair, weight: magnitude <= limit ? 1 : limit / magnitude };
    });
    const sumWeight = weighted.reduce((sum, item) => sum + item.weight, 0) || 1;
    const meanX = weighted.reduce((sum, item) => sum + item.pair.source * item.weight, 0) / sumWeight;
    const meanY = weighted.reduce((sum, item) => sum + item.pair.observed * item.weight, 0) / sumWeight;
    const denominator = weighted.reduce((sum, item) => sum + item.weight * (item.pair.source - meanX) ** 2, 0);
    scale =
      denominator > 1e-9
        ? weighted.reduce(
            (sum, item) => sum + item.weight * (item.pair.source - meanX) * (item.pair.observed - meanY),
            0,
          ) / denominator
        : 1;
    scale = clamp(scale, options.minDrift ?? 0.97, options.maxDrift ?? 1.03);
    intercept = meanY - scale * meanX;
  }
  const residuals = pairs.map((pair) => Math.abs(pair.observed - (scale * pair.source + intercept)));
  const threshold = Math.max(0.25, median(residuals) * 2.5);
  const inliers = pairs.filter((pair) => Math.abs(pair.observed - (scale * pair.source + intercept)) <= threshold);
  return {
    scale,
    intercept,
    inliers,
    inlierRatio: inliers.length / pairs.length,
    residualMedian: median(residuals),
  };
}

function snapToOnset(profile, duration, predicted, windowSeconds) {
  const left = Math.max(0, Math.floor(((predicted - windowSeconds) / duration) * (profile.length - 1)));
  const right = Math.min(
    profile.length - 1,
    Math.ceil(((predicted + windowSeconds) / duration) * (profile.length - 1)),
  );
  let bestIndex = Math.max(0, Math.min(profile.length - 1, Math.round((predicted / duration) * (profile.length - 1))));
  for (let index = left; index <= right; index++) if (profile[index] > profile[bestIndex]) bestIndex = index;
  const centroidRadius = 2;
  const neighborhood = profile.slice(
    Math.max(0, bestIndex - centroidRadius),
    Math.min(profile.length, bestIndex + centroidRadius + 1),
  );
  const baseline = Math.min(...neighborhood);
  let weightedIndex = 0;
  let weightTotal = 0;
  for (
    let index = Math.max(0, bestIndex - centroidRadius);
    index <= Math.min(profile.length - 1, bestIndex + centroidRadius);
    index++
  ) {
    const weight = Math.max(0, profile[index] - baseline);
    weightedIndex += index * weight;
    weightTotal += weight;
  }
  const center = weightTotal ? weightedIndex / weightTotal : bestIndex;
  return {
    index: bestIndex,
    time: (center / Math.max(1, profile.length - 1)) * duration,
    strength: profile[bestIndex],
  };
}

function onsetMargin(profile, index) {
  const left = profile[Math.max(0, index - 3)] || 0;
  const right = profile[Math.min(profile.length - 1, index + 3)] || 0;
  return clamp(profile[index] - (left + right) / 2, 0, 1);
}

function enforceMonotonicity(lines, duration, minimumGap) {
  let previous = 0;
  lines.forEach((line) => {
    if (!Number.isFinite(line.startTime)) return;
    line.startTime = Math.min(duration, Math.max(previous, line.startTime));
    previous = line.startTime + minimumGap;
  });
}

function refusal(base, lines, reason, diagnostics = {}) {
  return {
    ...base,
    lines: lines.map((line) => ({
      ...line,
      startTime: null,
      endTime: null,
      confidence: 0,
      reviewRequired: true,
      reasons: [reason],
      alignmentMethod: "retime_lrc_refused",
    })),
    confidence: 0,
    reviewRequired: true,
    diagnostics: { ...diagnostics, refused: true, reason },
  };
}

function inferDuration(lines) {
  return Math.max(...lines.map((line) => (Number.isFinite(line.startTime) ? line.startTime : 0)), 0);
}

function normalizedCorrelation(left, right) {
  const meanLeft = left.reduce((sum, value) => sum + value, 0) / left.length;
  const meanRight = right.reduce((sum, value) => sum + value, 0) / right.length;
  let numerator = 0,
    leftEnergy = 0,
    rightEnergy = 0;
  for (let index = 0; index < left.length; index++) {
    const a = left[index] - meanLeft,
      b = right[index] - meanRight;
    numerator += a * b;
    leftEnergy += a ** 2;
    rightEnergy += b ** 2;
  }
  return numerator / Math.sqrt((leftEnergy || 1) * (rightEnergy || 1));
}

function numeric(value) {
  return Array.from(value || [], Number).filter(Number.isFinite);
}

function standardDeviation(values) {
  const mean = values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, values.length));
}

function median(values) {
  if (!values.length) return 0;
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function checkAbort(signal) {
  if (signal?.aborted) {
    const error = new Error("LRC retiming was aborted.");
    error.name = "AbortError";
    throw error;
  }
}
