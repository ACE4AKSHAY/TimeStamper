/**
 * A deliberately simple offline baseline. It identifies comparatively active
 * portions of the audio and distributes supplied lyric lines across them.
 * It does not transcribe or claim word-level recognition; every output remains
 * an editable initial estimate.
 */
export function createEnergyInitialTimeline(lines, energyProfile, duration) {
  if (!lines.length || !energyProfile.length || !Number.isFinite(duration) || duration <= 0) return [];
  const sorted = [...energyProfile].sort((a, b) => a - b);
  const threshold = sorted[Math.floor(sorted.length * 0.35)] || 0;
  const weights = energyProfile.map((value) => Math.max(0.00001, value - threshold * 0.35));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const cumulative = [];
  weights.reduce((sum, weight, index) => (cumulative[index] = sum + weight), 0);
  let maximum = 0;
  for (const value of energyProfile) maximum = Math.max(maximum, value);
  let cursor = 0;
  return lines.map((line, index) => {
    const target = total * ((index + 0.15) / lines.length);
    while (cursor < weights.length - 1 && cumulative[cursor] < target) cursor += 1;
    const localStrength = energyProfile[cursor] / (maximum || 1);
    return {
      ...line,
      startTime: Math.min(duration, cursor / Math.max(1, energyProfile.length - 1) * duration),
      confidence: Math.round((0.12 + localStrength * 0.23) * 100) / 100,
      alignmentMethod: "energy_baseline",
      manuallyCorrected: false,
    };
  });
}
