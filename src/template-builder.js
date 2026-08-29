import { extractMfcc } from "./features.js";

/**
 * Build one MFCC template per lyric line from a manually verified reference
 * recording. The reference start times are the only supervision required.
 */
export function buildMfccLineTemplates(samples, sampleRate, referenceStarts, duration, options = {}) {
  if (!Array.isArray(referenceStarts) || !referenceStarts.length) throw new Error("Template building requires at least one reference start time.");
  if (!Number.isFinite(sampleRate) || sampleRate <= 0 || !Number.isFinite(duration) || duration <= 0) throw new Error("Template building requires a positive sample rate and duration.");
  const starts = referenceStarts.map(Number);
  if (starts.some((value, index) => !Number.isFinite(value) || value < 0 || value > duration || (index && value < starts[index - 1]))) throw new Error("Reference start times must be finite, in range, and monotonic.");
  const signal = Array.from(samples || [], Number);
  if (!signal.length) throw new Error("Template building requires non-empty reference audio samples.");
  const templates = starts.map((start, index) => {
    const end = Math.max(start + 1 / sampleRate, Math.min(duration, index + 1 < starts.length ? starts[index + 1] : duration));
    const first = Math.min(signal.length - 1, Math.max(0, Math.floor(start * sampleRate)));
    const last = Math.min(signal.length, Math.max(first + 1, Math.ceil(end * sampleRate)));
    const mfcc = extractMfcc(signal.slice(first, last), sampleRate, options);
    return mfcc.frames.length ? mfcc.frames : [Array.from({ length: options.coefficients || 13 }, () => 0)];
  });
  const frameRate = sampleRate / (options.hopSize || 256);
  return { templates, frameRate, sampleRate, duration, starts, frameSize: options.frameSize || 512, hopSize: options.hopSize || 256, melBands: options.melBands || 26, coefficients: options.coefficients || 13, method: "reference_mfcc_templates" };
}

/** Slice line templates from a previously extracted whole-recording MFCC grid. */
export function buildMfccLineTemplatesFromFrames(frames, frameRate, referenceStarts, duration, options = {}) {
  if (!Array.isArray(frames) || !frames.length || !Number.isFinite(frameRate) || frameRate <= 0) throw new Error("Precomputed MFCC templates require non-empty frames and a positive frame rate.");
  if (!Array.isArray(referenceStarts) || !referenceStarts.length || !Number.isFinite(duration) || duration <= 0) throw new Error("Precomputed MFCC templates require reference starts and duration.");
  const starts = referenceStarts.map(Number);
  if (starts.some((value, index) => !Number.isFinite(value) || value < 0 || value > duration || (index && value < starts[index - 1]))) throw new Error("Reference start times must be finite, in range, and monotonic.");
  const coefficientCount = options.coefficients || frames.find((frame) => Array.isArray(frame))?.length || 13;
  const templates = starts.map((start, index) => {
    const end = Math.max(1 / frameRate, Math.min(duration, index + 1 < starts.length ? starts[index + 1] : duration));
    const first = Math.max(0, Math.min(frames.length - 1, Math.floor(start * frameRate)));
    const last = Math.max(first + 1, Math.min(frames.length, Math.ceil(end * frameRate)));
    const line = frames.slice(first, last).map((frame) => Array.from(frame, Number));
    return line.length ? line : [Array.from({ length: coefficientCount }, () => 0)];
  });
  return { templates, frameRate, sampleRate: options.sampleRate || null, duration, starts, frameSize: options.frameSize || 512, hopSize: options.hopSize || Math.max(1, Math.round((options.sampleRate || frameRate * (options.hopSize || 256)) / frameRate)), melBands: options.melBands || 26, coefficients: coefficientCount, method: "reference_mfcc_templates_from_cached_frames" };
}
