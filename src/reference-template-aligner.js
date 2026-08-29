import { extractMfcc } from "./features.js";
import { buildMfccLineTemplates } from "./template-builder.js";
import { alignLineTemplates } from "./template-aligner.js";

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
  const lines = Array.isArray(lyrics) ? lyrics : lyrics?.lines;
  if (!Array.isArray(lines) || !lines.length) throw new Error("Reference-template alignment requires lyric lines.");
  if (!Number.isFinite(targetSampleRate) || targetSampleRate <= 0) throw new Error("Reference-template alignment requires a positive target sample rate.");
  const duration = Number.isFinite(targetDuration) && targetDuration > 0 ? targetDuration : (Array.from(targetSamples || []).length / targetSampleRate);
  if (!(duration > 0)) throw new Error("Reference-template alignment requires non-empty target audio.");
  if (!Array.isArray(referenceStarts) || referenceStarts.length !== lines.length) throw new Error("Reference timestamps and lyric line count must match.");

  const mfccOptions = { frameSize: 512, hopSize: 256, melBands: 26, coefficients: 13, ...(options.mfcc || {}) };
  const templates = buildMfccLineTemplates(referenceSamples, referenceSampleRate, referenceStarts, referenceDuration, mfccOptions);
  const targetMfcc = extractMfcc(targetSamples, targetSampleRate, mfccOptions);
  const largestTemplate = Math.max(...templates.templates.map((template) => template.length));
  const minLength = Math.max(1, Number.isFinite(options.minLength) ? options.minLength : 1);
  const maxLength = Math.max(minLength, Number.isFinite(options.maxLength) ? options.maxLength : Math.ceil(Math.max(largestTemplate * 2.5, targetMfcc.frames.length / lines.length * 2)));
  const alignment = alignLineTemplates(targetMfcc.frames, templates.templates, {
    frameRate: targetMfcc.frameRate,
    minLength,
    maxLength,
    slack: options.slack,
    window: options.window ?? 8,
  });
  const alignedLines = lines.map((line, index) => ({
    ...line,
    startTime: alignment.segments[index].startTime,
    endTime: alignment.segments[index].endTime,
    alignmentMethod: "reference_template_mfcc_dtw",
    confidence: null,
  }));
  return {
    method: "reference_template_mfcc_dtw",
    lines: alignedLines,
    alignment,
    reference: { duration: referenceDuration, sampleRate: referenceSampleRate, lineCount: referenceStarts.length, templateFrameRate: templates.frameRate },
    target: { duration, sampleRate: targetSampleRate, frameCount: targetMfcc.frames.length, frameRate: targetMfcc.frameRate },
    parameters: { mfcc: mfccOptions, minLength, maxLength, slack: options.slack ?? 2, window: options.window ?? 8 },
  };
}
