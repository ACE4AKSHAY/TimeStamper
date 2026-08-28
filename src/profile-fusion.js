/**
 * Normalize and combine time-aligned one-dimensional audio profiles.
 *
 * Profiles are deliberately numeric inputs rather than learned embeddings:
 * callers can supply RMS energy, spectral flux, onset strength, or another
 * explainable signal. Each profile is resampled to the longest input, scaled
 * to 0..1, then combined with explicit weights.
 */
export function resampleProfile(profile, length) {
  const values = Array.from(profile || [], Number).filter(Number.isFinite);
  if (!values.length || !Number.isInteger(length) || length <= 0) return [];
  if (values.length === length) return values;
  if (length === 1) return [values[0]];
  return Array.from({ length }, (_, index) => {
    const sourcePosition = index * (values.length - 1) / (length - 1);
    const left = Math.floor(sourcePosition), right = Math.min(values.length - 1, left + 1), fraction = sourcePosition - left;
    return values[left] * (1 - fraction) + values[right] * fraction;
  });
}

export function normalizeProfile(profile) {
  const values = Array.from(profile || [], Number);
  if (!values.length) throw new Error("Profiles must contain finite numeric values.");
  let minimum = Infinity, maximum = -Infinity;
  for (const value of values) {
    if (!Number.isFinite(value)) throw new Error("Profiles must contain finite numeric values.");
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
  }
  const range = maximum - minimum;
  return range > 0 ? values.map((value) => (value - minimum) / range) : values.map(() => 0);
}

export function fuseProfiles(profiles, weights = {}) {
  const entries = Object.entries(profiles || {}).filter(([, profile]) => Array.isArray(profile) && profile.length);
  if (!entries.length) throw new Error("At least one non-empty profile is required for fusion.");
  const length = entries.reduce((largest, [, profile]) => Math.max(largest, profile.length), 0);
  const prepared = entries.map(([name, profile]) => ({ name, weight: Number.isFinite(weights[name]) ? Math.max(0, weights[name]) : 1, values: normalizeProfile(resampleProfile(profile, length)) }));
  const totalWeight = prepared.reduce((sum, item) => sum + item.weight, 0);
  if (!totalWeight) throw new Error("At least one profile weight must be greater than zero.");
  const fused = Array.from({ length }, (_, index) => prepared.reduce((sum, item) => sum + item.values[index] * item.weight, 0) / totalWeight);
  return { profile: fused, length, components: prepared.map(({ name, weight }) => ({ name, weight })), method: "weighted_normalized_profile_fusion" };
}
