import { alignByAdaptiveBoundaryDp } from "./adaptive-boundary-aligner.js";
import { alignByVocalGatedBoundaryDp } from "./vocal-gated-aligner.js";

/** Summarize how often the supplied voicedness signal is confidently voiced. */
export function summarizeVoicedness(profile, options = {}) {
  const values = Array.from(profile || [], Number).filter(Number.isFinite);
  if (!values.length) throw new Error("Voicedness coverage requires a non-empty numeric profile.");
  const threshold = Number.isFinite(options.voicedThreshold) ? Math.max(0, Math.min(1, options.voicedThreshold)) : 0.5;
  const voicedFrames = values.filter((value) => value >= threshold).length;
  return { frameCount: values.length, voicedFrames, voicedCoverage: voicedFrames / values.length, meanVoicedness: values.reduce((sum, value) => sum + value, 0) / values.length, voicedThreshold: threshold };
}

/**
 * Select vocal-gated or energy-only alignment from voicedness coverage. This
 * is a transparent routing rule, not a learned classifier.
 */
export function alignByAdaptiveVocalBoundaryDp(lines, profiles, duration, options = {}) {
  const energy = profiles?.energy;
  const voicedness = profiles?.voicedness || profiles?.pitch;
  const summary = summarizeVoicedness(voicedness, options);
  const minimumCoverage = Number.isFinite(options.minimumVoicedCoverage) ? Math.max(0, Math.min(1, options.minimumVoicedCoverage)) : 0.2;
  if (summary.voicedCoverage >= minimumCoverage) {
    const alignment = alignByVocalGatedBoundaryDp(lines, { energy, voicedness }, duration, options);
    return { ...alignment, selectedEngine: "vocal-gated-boundary-dp", selection: { ...summary, minimumCoverage, reason: "voiced_coverage_sufficient" }, method: "adaptive_vocal_boundary_dynamic_programming" };
  }
  const alignment = alignByAdaptiveBoundaryDp(lines, energy, duration, options);
  return { ...alignment, selectedEngine: "adaptive-boundary-dp", selection: { ...summary, minimumCoverage, reason: "voiced_coverage_insufficient" }, method: "adaptive_vocal_boundary_dynamic_programming" };
}
