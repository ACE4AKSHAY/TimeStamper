import { normalizeText } from "../domain.js";
import { resampleProfile } from "../profile-fusion.js";
import { validateFormDescriptor } from "../contracts/index.js";

const SCRIPT_PATTERNS = [
  ["Latin", /\p{Script=Latin}/u],
  ["Telugu", /\p{Script=Telugu}/u],
  ["Devanagari", /\p{Script=Devanagari}/u],
  ["Tamil", /\p{Script=Tamil}/u],
  ["Han", /\p{Script=Han}/u],
  ["Hiragana", /\p{Script=Hiragana}/u],
  ["Katakana", /\p{Script=Katakana}/u],
  ["Hangul", /\p{Script=Hangul}/u],
  ["Arabic", /\p{Script=Arabic}/u],
  ["Cyrillic", /\p{Script=Cyrillic}/u],
];
const LETTER = /\p{Letter}/u;

/**
 * Detect the observable form of an alignment request without language or
 * recording-specific rules. Voicedness is a bounded audio proxy, not a voice
 * classifier; the returned reasons make that limitation explicit to callers.
 */
export function detectForm(request = {}) {
  const lines = Array.isArray(request.lines) ? request.lines : [];
  const audio = request.audio || {};
  const timedLyrics = request.timedLyrics;
  const timingLevel = timedLyrics?.timedWords?.length
    ? "word"
    : timedLyrics?.timedLines?.length || lines.some((line) => Number.isFinite(line?.startTime))
      ? "line"
      : "none";
  const scripts = lines.map((line) => detectLineScript(line?.text ?? line?.originalText ?? ""));
  const dominantScript = dominant(scripts.filter((script) => script !== "mixed" && script !== "other"));
  const profiles = audio.profiles || audio.features || request.profiles || {};
  const vocal = estimateVocalCoverage(profiles);
  const repeatedLineRatio = calculateRepeatedLineRatio(lines);
  const reasons = [];

  if (timingLevel === "none") reasons.push("no timed lyrics supplied");
  else reasons.push(`${timingLevel}-timed lyrics supplied`);
  if (request.reference) reasons.push("verified reference recording supplied");
  if (dominantScript && dominantScript !== "Latin") reasons.push(`dominant script is ${dominantScript}`);
  if (scripts.includes("mixed")) reasons.push("one or more lyric lines contain mixed scripts");
  if (repeatedLineRatio > 0) reasons.push(`repeated lyric ratio is ${repeatedLineRatio.toFixed(2)}`);
  if (vocal.vocalCoverage === null) reasons.push("voicedness proxy unavailable; vocal coverage is unknown");
  else reasons.push("vocal coverage is a deterministic voicedness-plus-energy proxy");
  if (vocal.instrumentalLikelihood !== null && vocal.instrumentalLikelihood >= 0.7) {
    reasons.push("high instrumental likelihood; verify before automatic alignment");
  }

  const result = {
    hasTimedLyrics: timingLevel !== "none",
    timingLevel,
    hasReference: Boolean(request.reference),
    scripts,
    dominantScript: dominantScript || null,
    lineCount: lines.length,
    duration: Number.isFinite(audio.duration) && audio.duration >= 0 ? audio.duration : 0,
    vocalCoverage: vocal.vocalCoverage,
    instrumentalLikelihood: vocal.instrumentalLikelihood,
    hasVocalStem: Boolean(audio.hasVocalStem || audio.vocalStem || profiles.vocalStem),
    repeatedLineRatio,
    ...(typeof request.languageHint === "string" && request.languageHint.trim()
      ? { languageHint: request.languageHint.trim() }
      : {}),
    reasons,
  };
  return validateFormDescriptor(result);
}

export function detectLineScript(text) {
  const value = String(text || "");
  const matches = SCRIPT_PATTERNS.filter(([, pattern]) => pattern.test(value)).map(([name]) => name);
  if (matches.length > 1) return "mixed";
  if (matches.length === 1) return matches[0];
  return LETTER.test(value) ? "other" : "other";
}

function dominant(values) {
  const counts = new Map();
  values.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return (
    [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0] || null
  );
}

function calculateRepeatedLineRatio(lines) {
  const normalized = lines.map((line) => normalizeText(line?.text ?? line?.originalText ?? "")).filter(Boolean);
  if (normalized.length < 2) return 0;
  return Math.max(0, Math.min(1, 1 - new Set(normalized).size / normalized.length));
}

function estimateVocalCoverage(profiles) {
  const energy = numericProfile(profiles.energy);
  const voicedness = numericProfile(profiles.voicedness);
  if (!energy.length || !voicedness.length) return { vocalCoverage: null, instrumentalLikelihood: null };
  const length = Math.max(energy.length, voicedness.length);
  const energyValues = resampleProfile(energy, length);
  const voicedValues = resampleProfile(voicedness, length);
  const active = energyValues.filter((value) => value > 0.08);
  if (!active.length) return { vocalCoverage: 0, instrumentalLikelihood: 1 };
  const voicedActive = energyValues.reduce(
    (count, value, index) => count + (value > 0.08 && voicedValues[index] >= 0.35 ? 1 : 0),
    0,
  );
  const vocalCoverage = Math.max(0, Math.min(1, voicedActive / active.length));
  return { vocalCoverage, instrumentalLikelihood: 1 - vocalCoverage };
}

function numericProfile(value) {
  return Array.from(value || [], Number).filter(Number.isFinite);
}
