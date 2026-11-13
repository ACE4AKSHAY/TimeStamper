import { normalizeProfile } from "./profile-fusion.js";

/**
 * Optional repeated-line sanity check. It compares local audio-profile
 * windows for equal normalized lyric text; it is a review aid, not a truth
 * detector or a learned structural model.
 */
export function applyStructureAwareChecks(lines, profile, duration, options = {}) {
  const values = Array.from(profile || [], Number).filter(Number.isFinite);
  if (!values.length || !Number.isFinite(duration) || duration <= 0)
    return { lines, diagnostics: { enabled: false, reason: "profile unavailable" } };
  const normalized = normalizeProfile(values);
  const groups = new Map();
  lines.forEach((line, index) => {
    const key = String(line.text ?? line.originalText ?? "")
      .normalize("NFC")
      .replace(/\s+/gu, " ")
      .trim();
    if (!key) return;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(index);
  });
  const threshold = options.similarityThreshold ?? 0.65;
  const output = lines.map((line) => ({ ...line }));
  let comparedPairs = 0;
  let improvedCount = 0;
  let inconsistentCount = 0;
  for (const indexes of groups.values()) {
    if (indexes.length < 2) continue;
    const reference =
      indexes.find((index) => Number.isFinite(output[index].confidence) && output[index].confidence >= 0.65) ??
      indexes[0];
    for (const index of indexes) {
      if (
        index === reference ||
        !Number.isFinite(output[index].startTime) ||
        !Number.isFinite(output[reference].startTime)
      )
        continue;
      comparedPairs++;
      const similarity = windowSimilarity(normalized, output[index].startTime, output[reference].startTime, duration);
      output[index].structureReview = { similarity, referenceIndex: reference };
      if (similarity >= threshold) {
        const before = output[index].confidence ?? 0;
        output[index].confidence = Math.max(before, Math.min(1, (output[reference].confidence ?? 0.5) * similarity));
        output[index].reviewRequired = output[index].reviewRequired && output[index].confidence < 0.65;
        if (output[index].confidence > before) improvedCount++;
      } else {
        inconsistentCount++;
        output[index].reviewRequired = true;
        output[index].reasons = [...(output[index].reasons || []), "repeated lyric has inconsistent audio structure"];
      }
    }
  }
  return { lines: output, diagnostics: { enabled: true, comparedPairs, improvedCount, inconsistentCount, threshold } };
}

function windowSimilarity(profile, leftTime, rightTime, duration) {
  const left = window(profile, leftTime, duration);
  const right = window(profile, rightTime, duration);
  if (!left.length || left.length !== right.length) return 0;
  const leftMean = left.reduce((sum, value) => sum + value, 0) / left.length;
  const rightMean = right.reduce((sum, value) => sum + value, 0) / right.length;
  let numerator = 0,
    leftEnergy = 0,
    rightEnergy = 0;
  for (let index = 0; index < left.length; index++) {
    const a = left[index] - leftMean;
    const b = right[index] - rightMean;
    numerator += a * b;
    leftEnergy += a ** 2;
    rightEnergy += b ** 2;
  }
  return Math.max(0, Math.min(1, numerator / Math.sqrt((leftEnergy || 1) * (rightEnergy || 1))));
}

function window(profile, time, duration) {
  const center = Math.round((time / duration) * (profile.length - 1));
  return profile.slice(Math.max(0, center - 4), Math.min(profile.length, center + 5));
}
