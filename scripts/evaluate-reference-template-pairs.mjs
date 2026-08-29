import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { decodeAudioFile } from "../src/audio-decoder.mjs";
import { extractReferenceStarts } from "../src/evaluation.js";
import { parseLyrics } from "../src/lyrics.js";
import { alignWithReferenceTemplates } from "../src/reference-template-aligner.js";
import { alignWithReferenceTemplateEnsemble } from "../src/reference-template-ensemble.js";
import { scoreTimestamps, summarizeConfidence } from "../src/metrics.js";
import { validateReferenceTargetPair } from "../src/reference-target-validation.js";
import { FeatureCache } from "../src/feature-cache.mjs";
import { loadOrExtractMfcc } from "../src/mfcc-feature-cache.mjs";

const root = resolve(process.argv[2] || "benchmarks/private/reference-template-pairs");
const output = resolve(process.argv[3] || "benchmarks/private/reference-template-pair-evaluation.json");
const limit = Number.isFinite(Number(process.argv[4])) && Number(process.argv[4]) > 0 ? Math.floor(Number(process.argv[4])) : Infinity;
const audioExtensions = new Set([".mp3", ".m4a", ".wav", ".wave", ".flac", ".ogg", ".opus", ".aac"]);
const lyricExtensions = new Set([".lrc", ".txt"]);
const options = {
  dtwImplementation: process.env.LYRICSYNC_DTW_IMPLEMENTATION === "banded" ? "banded" : undefined,
  useReferenceAnchors: process.env.LYRICSYNC_REFERENCE_ANCHORS !== "0",
  anchorScale: process.env.LYRICSYNC_REFERENCE_ANCHOR_SCALE === "duration-ratio" ? "duration-ratio" : undefined,
  templateBoundaryRadius: finiteEnvNumber("LYRICSYNC_TEMPLATE_BOUNDARY_RADIUS", 0, (value) => Math.max(0, Math.floor(value))),
  templateBoundaryMinImprovementRatio: finiteEnvNumber("LYRICSYNC_TEMPLATE_BOUNDARY_MIN_IMPROVEMENT_RATIO", 0, (value) => Math.max(0, value)),
  featureNormalization: process.env.LYRICSYNC_FEATURE_NORMALIZATION === "global-zscore" ? "global-zscore" : "none",
};
const ensembleMode = process.env.LYRICSYNC_TEMPLATE_ENSEMBLE === "1";
const ensembleOptions = {
  weightByConfidence: process.env.LYRICSYNC_ENSEMBLE_WEIGHT_BY_CONFIDENCE === "1",
  clusterToleranceSeconds: finiteEnvNumber("LYRICSYNC_ENSEMBLE_CLUSTER_TOLERANCE", 0, (value) => Math.max(0, value)),
  confidenceScale: finiteEnvNumber("LYRICSYNC_ENSEMBLE_CONFIDENCE_SCALE", 0.5, (value) => Math.max(0.000001, value)),
};
const featureCache = new FeatureCache(process.env.LYRICSYNC_FEATURE_CACHE_DIR || "cache/features");
let entries = [];
try { entries = (await readdir(root, { withFileTypes: true })).filter((entry) => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name)).slice(0, limit); } catch { entries = []; }
const cases = [];
for (const entry of entries) cases.push(await evaluateCase(join(root, entry.name), entry.name));
const evaluated = cases.filter((item) => item.status === "evaluated");
const errors = evaluated.flatMap((item) => item.metrics.errorsSeconds);
const document = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  purpose: "held-out alternate-recording evaluation of reference-assisted MFCC/DTW",
  limitation: "requires manually verified target timestamps; a cover, live or remix may legitimately change line timing",
  configuration: { ...options, ensembleMode, ensembleOptions },
  privacy: "metadata, local paths and generated timestamps/metrics only; source media and lyric text were not copied",
  root,
  summary: { discoveredCases: cases.length, evaluatedCases: evaluated.length, skippedCases: cases.filter((item) => item.status === "skipped").length, failedCases: cases.filter((item) => item.status === "failed").length },
  aggregate: errors.length ? scoreTimestamps(errors, errors.map(() => 0)) : null,
  cases,
};
await mkdir(resolve(output, ".."), { recursive: true });
await writeFile(output, JSON.stringify(document, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ output, summary: document.summary, aggregate: document.aggregate }, null, 2));

async function evaluateCase(caseRoot, id) {
  try {
    const files = await readdir(caseRoot, { withFileTypes: true });
    const audio = files.filter((entry) => entry.isFile() && audioExtensions.has(extname(entry.name).toLowerCase()));
    const referenceAudio = findNamed(audio, ["reference", "reference-audio", "source"]);
    const targetAudio = findNamed(audio, ["target", "target-audio", "alternate"]);
    const lyricCandidates = files.filter((entry) => entry.isFile() && lyricExtensions.has(extname(entry.name).toLowerCase())).sort((a, b) => a.name.localeCompare(b.name));
    const lyric = lyricCandidates.find((entry) => entry.name.toLowerCase() === "lyrics.lrc") || lyricCandidates[0];
    const referenceDocument = await readJson(join(caseRoot, "reference.json"));
    const targetDocument = await readJson(join(caseRoot, "target-reference.json"));
    if (!referenceAudio || !targetAudio || !lyric || referenceDocument?.verified !== true || targetDocument?.verified !== true) return { id, status: "skipped", reason: "requires_reference_audio_target_audio_lyrics_and_two_verified_reference_documents" };
    const [reference, target, lyricsText] = await Promise.all([decodeAudioFile(join(caseRoot, referenceAudio.name)), decodeAudioFile(join(caseRoot, targetAudio.name)), readFile(join(caseRoot, lyric.name), "utf8")]);
    const lyrics = parseLyrics(lyricsText, "reference_template_pair_evaluation");
    const referenceStarts = extractReferenceStarts(referenceDocument), targetStarts = extractReferenceStarts(targetDocument);
    if (referenceStarts.length !== lyrics.lines.length || targetStarts.length !== lyrics.lines.length) return { id, status: "failed", reason: "reference_or_target_line_count_does_not_match_lyrics" };
    const preflight = validateReferenceTargetPair({ referenceDuration: reference.duration, targetDuration: target.duration, referenceStarts, targetStarts, lineCount: lyrics.lines.length });
    if (preflight.status === "invalid") return { id, status: "failed", reason: "reference_target_preflight_failed", preflight };
    const referenceMfcc = await loadOrExtractMfcc({ audioPath: join(caseRoot, referenceAudio.name), decoded: reference, cache: featureCache, enabled: process.env.LYRICSYNC_DISABLE_FEATURE_CACHE !== "1" });
    const targetMfcc = await loadOrExtractMfcc({ audioPath: join(caseRoot, targetAudio.name), decoded: target, cache: featureCache, enabled: process.env.LYRICSYNC_DISABLE_FEATURE_CACHE !== "1" });
    const started = performance.now();
    const commonInput = { referenceSamples: reference.samples, referenceSampleRate: reference.sampleRate, referenceStarts, referenceDuration: reference.duration, targetSamples: target.samples, targetSampleRate: target.sampleRate, targetDuration: target.duration, lyrics: lyrics.lines, referenceMfcc, targetMfcc };
    const result = ensembleMode
      ? alignWithReferenceTemplateEnsemble({ ...commonInput, duration: target.duration, ensembleOptions, variants: [
        { name: "anchored", options: { ...options, useReferenceAnchors: true, referenceMfcc, targetMfcc } },
        { name: "anchor-free", options: { ...options, useReferenceAnchors: false, referenceMfcc, targetMfcc } },
        { name: "boundary-refined", options: { ...options, useReferenceAnchors: true, templateBoundaryRadius: Math.max(1, options.templateBoundaryRadius), referenceMfcc, targetMfcc } },
      ] })
      : alignWithReferenceTemplates({ ...commonInput, options: { ...options, referenceMfcc, targetMfcc } });
    const predicted = result.lines.map((line) => line.startTime);
    const metrics = scoreTimestamps(predicted, targetStarts);
    return { id, status: "evaluated", referenceAudioPath: join(caseRoot, referenceAudio.name), targetAudioPath: join(caseRoot, targetAudio.name), lyricPath: join(caseRoot, lyric.name), lineCount: targetStarts.length, preflight, runtimeMs: performance.now() - started, metrics, confidence: { mean: result.lines.reduce((sum, line) => sum + (line.confidence || 0), 0) / result.lines.length, reviewRequired: result.lines.filter((line) => line.reviewRequired).length, failureCategories: countFailureCategories(result.lines), calibration: summarizeConfidence(predicted, targetStarts, result.lines.map((line) => line.confidence)) }, refinement: summarizeRefinement(result.alignment?.templateBoundaryRefinement), candidates: result.candidates?.map((candidate) => ({ name: candidate.name, starts: candidate.starts })) || [], diagnostics: result.alignment?.diagnostics || null };
  } catch (error) { return { id, status: "failed", reason: error.code || error.message || "pair_evaluation_failed" }; }
}

function countFailureCategories(lines) { return lines.reduce((counts, line) => { const category = line.failureCategory || "unknown"; counts[category] = (counts[category] || 0) + 1; return counts; }, {}); }

function summarizeRefinement(diagnostics) {
  if (!Array.isArray(diagnostics)) return { boundaryCount: 0, changedCount: 0, totalShiftFrames: 0, meanImprovement: 0 };
  const changed = diagnostics.filter((item) => item.changed);
  return { boundaryCount: diagnostics.length, changedCount: changed.length, totalShiftFrames: changed.reduce((sum, item) => sum + Math.abs(Number(item.shiftFrames) || 0), 0), meanImprovement: diagnostics.length ? diagnostics.reduce((sum, item) => sum + (Number(item.improvement) || 0), 0) / diagnostics.length : 0 };
}

function finiteEnvNumber(name, fallback, transform) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? transform(value) : fallback;
}

function findNamed(files, stems) { return files.filter((file) => stems.includes(file.name.slice(0, file.name.lastIndexOf(".")).toLowerCase())).sort((a, b) => a.name.localeCompare(b.name))[0]; }
async function readJson(path) { return JSON.parse(await readFile(path, "utf8")); }
