import { createEnergyInitialTimeline } from "./energy-aligner.js";
import { fuseProfiles } from "./profile-fusion.js";

/**
 * Produce editable line starts from several explainable audio profiles.
 * This is a deterministic heuristic, not machine learning and not speech
 * recognition. The fused activity profile is passed through the existing
 * energy baseline so the line distribution remains monotonic and inspectable.
 */
export function createCombinedInitialTimeline(lines, profiles, duration, options = {}) {
  const fusion = fuseProfiles(profiles, options.weights || {});
  const aligned = createEnergyInitialTimeline(lines, fusion.profile, duration);
  return {
    lines: aligned.map((line) => ({ ...line, alignmentMethod: "combined_profile", confidence: line.confidence === null ? null : Math.min(0.99, Math.round((line.confidence + 0.08) * 100) / 100) })),
    profile: fusion.profile,
    fusion,
    parameters: { weights: Object.fromEntries(fusion.components.map((item) => [item.name, item.weight])) },
  };
}
