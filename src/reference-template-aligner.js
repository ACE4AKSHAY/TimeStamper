import { extractMfcc } from "./features.js";
import { buildMfccLineTemplates, buildMfccLineTemplatesFromFrames } from "./template-builder.js";
import { alignLineTemplates } from "./template-aligner.js";
import { validateSeparatedAudio } from "./vocal-separator.js";
import { refineTemplateBoundaries } from "./template-boundary-refiner.js";
import { recomputeTemplateDiagnostics } from "./template-diagnostics.js";
import { fitFeatureNormalization, transformFeatureFrames } from "./feature-normalizer.js";

/**
 * Align a target recording using MFCC line templates cut from a manually
 * verified reference recording. This is deliberately an assisted mode: the
 * reference timestamps supply the acoustic examples, while constrained DTW
 * finds the corresponding monotonic segments in the target.
 */
export function alignWithReferenceTemplates({
  referenceSamples,
  referenceSampleRate,
  referenceStarts,
  referenceDuration,
  targetSamples,
  targetSampleRate,
  targetDuration,
  lyrics,
  options = {},
}) {
  throwIfAborted(options.signal);
  const lines = Array.isArray(lyrics) ? lyrics : lyrics?.lines;
  if (!Array.isArray(lines) || !lines.length) throw new Error("Reference-template alignment requires lyric lines.");
  if (!Number.isFinite(targetSampleRate) || targetSampleRate <= 0) throw new Error("Reference-template alignment requires a positive target sample rate.");
  const duration = Number.isFinite(targetDuration) && targetDuration > 0 ? targetDuration : (Array.from(targetSamples || []).length / targetSampleRate);
  if (!(duration > 0)) throw new Error("Reference-template alignment requires non-empty target audio.");
  if (!Array.isArray(referenceStarts) || referenceStarts.length !== lines.length) throw new Error("Reference timestamps and lyric line count must match.");

  const mfccOptions = { frameSize: 512, hopSize: 256, melBands: 26, coefficients: 13, ...(options.mfcc || {}) };
  const templates = options.referenceMfcc?.frames?.length
    ? buildMfccLineTemplatesFromFrames(options.referenceMfcc.frames, options.referenceMfcc.frameRate, referenceStarts, referenceDuration, { ...mfccOptions, sampleRate: referenceSampleRate })
    : buildMfccLineTemplates(referenceSamples, referenceSampleRate, referenceStarts, referenceDuration, mfccOptions);
  const targetMfcc = options.targetMfcc?.frames?.length ? options.targetMfcc : extractMfcc(targetSamples, targetSampleRate, mfccOptions);
  const featureNormalization = fitFeatureNormalization([...templates.templates, targetMfcc.frames], { mode: options.featureNormalization });
  const normalizedTemplates = templates.templates.map((template) => transformFeatureFrames(template, featureNormalization));
  const normalizedTargetFrames = transformFeatureFrames(targetMfcc.frames, featureNormalization);
  const largestTemplate = Math.max(...normalizedTemplates.map((template) => template.length));
  const minLength = Math.max(1, Number.isFinite(options.minLength) ? options.minLength : 1);
  const maxLength = Math.max(minLength, Number.isFinite(options.maxLength) ? options.maxLength : Math.ceil(Math.max(largestTemplate * 2.5, targetMfcc.frames.length / lines.length * 2)));
  const referenceDurations = referenceStarts.map((start, index) => Math.max(1 / referenceSampleRate, (index + 1 < referenceStarts.length ? referenceStarts[index + 1] : referenceDuration) - start));
  const anchorScale = options.anchorScale === "duration-ratio" ? duration / Math.max(referenceDuration, 1 / referenceSampleRate) : Number.isFinite(options.anchorScale) && options.anchorScale > 0 ? options.anchorScale : 1;
  const expectedLengths = referenceDurations.map((seconds) => Math.max(1, seconds * anchorScale * targetMfcc.frameRate));
  const searchStride = Math.max(1, Math.floor(options.searchStride ?? (targetMfcc.frames.length > 8000 ? 4 : 1)));
  const featureStride = Math.max(1, Math.floor(options.featureStride ?? (targetMfcc.frames.length > 8000 ? 4 : 1)));
  const descriptorTopK = Math.max(0, Math.floor(options.descriptorTopK ?? (targetMfcc.frames.length > 8000 ? 6 : 0)));
  const useReferenceAnchors = options.useReferenceAnchors !== false;
  const initialFrame = Math.max(0, Math.min(targetMfcc.frames.length - 1, Math.round((options.initialOffsetSeconds ?? (useReferenceAnchors ? referenceStarts[0] * anchorScale : 0)) * targetMfcc.frameRate)));
  const expectedStarts = useReferenceAnchors ? referenceStarts.map((seconds) => Math.max(0, Math.min(targetMfcc.frames.length - 1, Math.round(seconds * anchorScale * targetMfcc.frameRate)))) : null;
  const anchorToleranceSeconds = Number.isFinite(options.anchorToleranceSeconds) ? Math.max(0, options.anchorToleranceSeconds) : 1;
  const anchorToleranceFrames = Math.max(0, Math.round(anchorToleranceSeconds * targetMfcc.frameRate));
  let alignment = alignLineTemplates(normalizedTargetFrames, normalizedTemplates, {
    frameRate: targetMfcc.frameRate,
    minLength,
    maxLength,
    expectedLengths,
    lengthTolerance: options.lengthTolerance ?? 0.75,
    searchStride,
    featureStride,
    descriptorTopK,
    descriptorDimensions: options.descriptorDimensions ?? 6,
    initialFrame,
    expectedStarts,
    anchorToleranceFrames,
    slack: options.slack,
    window: options.window ?? 8,
    dtwImplementation: options.dtwImplementation,
    signal: options.signal,
    onProgress: options.onProgress,
  });
  const refinementRadius = Math.max(0, Math.floor(options.templateBoundaryRadius ?? 0));
  const refinementMinImprovementRatio = Number.isFinite(options.templateBoundaryMinImprovementRatio)
    ? Math.max(0, options.templateBoundaryMinImprovementRatio)
    : 0;
  if (refinementRadius > 0) {
    const refinement = refineTemplateBoundaries(normalizedTargetFrames, normalizedTemplates, alignment.segments, { radius: refinementRadius, frameRate: targetMfcc.frameRate, minLength, window: options.window ?? 8, dtwImplementation: options.dtwImplementation, minImprovementRatio: refinementMinImprovementRatio });
    const refreshed = recomputeTemplateDiagnostics(normalizedTargetFrames, normalizedTemplates, refinement.segments, { minLength, window: options.window ?? 8, dtwImplementation: options.dtwImplementation, featureStride, confidenceScale: options.confidenceScale, reviewThreshold: options.reviewThreshold, marginFrames: options.marginFrames, boundaryMarginThreshold: options.boundaryMarginThreshold });
    alignment = { ...alignment, segments: refreshed.segments, diagnostics: { ...alignment.diagnostics, ...refreshed.diagnostics }, templateBoundaryRefinement: refinement.diagnostics, refinementMethod: refinement.method };
  }
  const alignedLines = lines.map((line, index) => ({
    ...line,
    startTime: alignment.segments[index].startTime,
    endTime: alignment.segments[index].endTime,
    alignmentMethod: "reference_template_mfcc_dtw",
    confidence: alignment.segments[index].confidence,
    reviewRequired: alignment.segments[index].reviewRequired,
    failureCategory: alignment.segments[index].failureCategory,
  }));
  return {
    method: "reference_template_mfcc_dtw",
    lines: alignedLines,
    alignment,
    reference: { duration: referenceDuration, sampleRate: referenceSampleRate, lineCount: referenceStarts.length, templateFrameRate: templates.frameRate },
    target: { duration, sampleRate: targetSampleRate, frameCount: targetMfcc.frames.length, frameRate: targetMfcc.frameRate },
    parameters: { mfcc: mfccOptions, minLength, maxLength, expectedLengths, anchorScale, featureNormalization: featureNormalization.mode, templateBoundaryRadius: refinementRadius, templateBoundaryMinImprovementRatio: refinementMinImprovementRatio, lengthTolerance: options.lengthTolerance ?? 0.75, searchStride, featureStride, descriptorTopK, descriptorDimensions: options.descriptorDimensions ?? 6, useReferenceAnchors, initialFrame, expectedStarts, anchorToleranceSeconds, anchorToleranceFrames, slack: options.slack ?? 2, window: options.window ?? 8, dtwImplementation: options.dtwImplementation === "banded" ? "banded" : "full-matrix" },
  };
}

function throwIfAborted(signal) {
  if (signal?.aborted) {
    const error = new Error("Reference-template alignment aborted.");
    error.name = "AbortError";
    throw error;
  }
}

/**
 * Run an optional separator before aligning a target. The separator can be a
 * local model, native adapter, or deterministic passthrough; the alignment
 * core only receives validated mono PCM and remains model-agnostic.
 */
export async function alignWithSeparatedReferenceTarget({ separator, targetInput, ...alignmentInput }) {
  if (!separator || typeof separator.separate !== "function") throw new Error("Separated reference alignment requires a separator adapter.");
  const separated = validateSeparatedAudio(await separator.separate(targetInput));
  return alignWithReferenceTemplates({ ...alignmentInput, targetSamples: separated.samples, targetSampleRate: separated.sampleRate, targetDuration: separated.duration });
}
