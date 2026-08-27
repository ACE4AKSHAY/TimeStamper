import { alignByBoundaryDp } from "./boundary-dp-aligner.js";
import { fuseProfiles } from "./profile-fusion.js";

/**
 * Combine named explainable profiles, then run the preserved boundary-DP
 * optimizer. No feature is discarded; weights are explicit and reproducible.
 */
export function alignMultiProfile(lines, profiles, duration, options = {}) {
  const fusion = fuseProfiles(profiles, options.weights || { energy: 0.5, spectralFlux: 0.3, voicedness: 0.2 });
  const alignment = alignByBoundaryDp(lines, fusion.profile, duration, options);
  const alignedLines = lines.map((line, index) => ({ ...line, startTime: alignment.segments[index].startTime, endTime: alignment.segments[index].endTime, alignmentMethod: "multi_profile_boundary_dp", confidence: null }));
  return { lines: alignedLines, profile: fusion.profile, fusion, alignment, parameters: { ...alignment, weights: fusion.components } };
}
