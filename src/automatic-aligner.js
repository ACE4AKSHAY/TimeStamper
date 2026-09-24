import { alignByAdaptiveBoundaryDp } from "./adaptive-boundary-aligner.js";
import { alignByAdaptiveVocalBoundaryDp, summarizeVoicedness } from "./adaptive-vocal-aligner.js";
import { createCombinedInitialTimeline } from "./combined-aligner.js";

/** Select an explainable alignment route from the profiles available for a recording. */
export function selectAutomaticRoute(profiles = {}, options = {}) {
  const energy = profiles.energy;
  const voicedness = profiles.voicedness || profiles.pitch;
  const hasEnergy = Array.isArray(energy) && energy.length > 0;
  const hasFlux = Array.isArray(profiles.spectralFlux) && profiles.spectralFlux.length > 0;
  const minimumVoicedCoverage = Number.isFinite(options.minimumVoicedCoverage) ? Math.max(0, Math.min(1, options.minimumVoicedCoverage)) : 0.2;
  const voicedSummary = voicedness?.length ? summarizeVoicedness(voicedness, options) : null;
  if (hasEnergy && voicedSummary && voicedSummary.voicedCoverage >= minimumVoicedCoverage) return { engine: "adaptive-vocal-boundary-dp", reason: "voiced_coverage_sufficient", minimumVoicedCoverage, voicedSummary };
  if (hasEnergy && hasFlux) return { engine: "combined-profile", reason: "spectral_flux_available", minimumVoicedCoverage, voicedSummary };
  if (hasEnergy) return { engine: "adaptive-boundary-dp", reason: "energy_fallback", minimumVoicedCoverage, voicedSummary };
  throw new Error("Automatic alignment requires an energy profile or another supported audio profile.");
}

/** Run the selected route and retain the route diagnostics in the result. */
export function alignAutomatically(lines, profiles, duration, options = {}) {
  const route = selectAutomaticRoute(profiles, options);
  if (route.engine === "combined-profile") {
    const result = createCombinedInitialTimeline(lines, profiles, duration, options);
    return { ...result, selectedEngine: route.engine, selection: route };
  }
  const base = route.engine === "adaptive-vocal-boundary-dp" ? alignByAdaptiveVocalBoundaryDp(lines, profiles, duration, options) : alignByAdaptiveBoundaryDp(lines, profiles.energy, duration, options);
  const alignedLines = lines.map((line, index) => ({ ...line, startTime: base.segments[index].startTime, endTime: base.segments[index].endTime, alignmentMethod: base.method, confidence: null }));
  return { ...base, lines: alignedLines, selectedEngine: route.engine, selection: route };
}
