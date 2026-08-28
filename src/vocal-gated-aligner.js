import { alignByAdaptiveBoundaryDp } from "./adaptive-boundary-aligner.js";
import { normalizeProfile, resampleProfile } from "./profile-fusion.js";

/**
 * Gate an explainable energy profile with voicedness before boundary search.
 * This suppresses strong instrumental-only activity when pitch/voicedness is
 * low, while retaining a configurable floor for breathy or difficult vocals.
 */
export function buildVocalGatedProfile(energyProfile, voicednessProfile, options = {}) {
  if (!Array.isArray(energyProfile) || !energyProfile.length || !Array.isArray(voicednessProfile) || !voicednessProfile.length) throw new Error("Vocal gating requires non-empty energy and voicedness profiles.");
  const length = Math.max(energyProfile.length, voicednessProfile.length);
  const energy = normalizeProfile(resampleProfile(energyProfile, length));
  const voicedness = normalizeProfile(resampleProfile(voicednessProfile, length));
  const gateFloor = Number.isFinite(options.gateFloor) ? Math.max(0, Math.min(1, options.gateFloor)) : 0.15;
  const gated = energy.map((value, index) => value * (gateFloor + (1 - gateFloor) * voicedness[index]));
  return { profile: gated, energy, voicedness, length, gateFloor, method: "energy_voicedness_multiplicative_gate" };
}

/** Align lyric boundaries using energy activity suppressed by unvoiced frames. */
export function alignByVocalGatedBoundaryDp(lines, profiles, duration, options = {}) {
  const energy = profiles?.energy;
  const voicedness = profiles?.voicedness || profiles?.pitch;
  const gated = buildVocalGatedProfile(energy, voicedness, options);
  const alignment = alignByAdaptiveBoundaryDp(lines, gated.profile, duration, options);
  return { ...alignment, profile: gated.profile, gating: gated, method: "vocal_gated_boundary_dynamic_programming" };
}
