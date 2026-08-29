import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { decodeAudioFile } from "../src/audio-decoder.mjs";
import { parseLyrics } from "../src/lyrics.js";
import { alignWithReferenceTemplates } from "../src/reference-template-aligner.js";
import { scoreTimestamps, summarizeConfidence } from "../src/metrics.js";
import { FeatureCache } from "../src/feature-cache.mjs";
import { loadOrExtractMfcc } from "../src/mfcc-feature-cache.mjs";

const root = resolve(process.argv[2] || "benchmarks/private/verified-cases");
const output = resolve(process.argv[3] || "benchmarks/private/reference-template-self-evaluation.json");
const limit = Number.isFinite(Number(process.argv[4])) && Number(process.argv[4]) > 0 ? Math.floor(Number(process.argv[4])) : Infinity;
const audioExtensions = new Set([".mp3", ".m4a", ".wav", ".wave", ".flac", ".ogg", ".opus", ".aac"]);
const lyricExtensions = new Set([".lrc", ".txt"]);
const dtwImplementation = process.env.LYRICSYNC_DTW_IMPLEMENTATION === "banded" ? "banded" : undefined;
const useReferenceAnchors = process.env.LYRICSYNC_REFERENCE_ANCHORS === "0" ? false : true;
const featureCache = new FeatureCache(process.env.LYRICSYNC_FEATURE_CACHE_DIR || "cache/features");
const entries = (await readdir(root, { withFileTypes: true })).filter((entry) => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name)).slice(0, limit);
const cases = [];
for (const entry of entries) cases.push(await evaluateCase(join(root, entry.name), entry.name));
const evaluated = cases.filter((item) => item.status === "evaluated");
const allErrors = evaluated.flatMap((item) => item.metrics.errorsSeconds);
const document = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  purpose: "real-recording implementation sanity check using each reviewed recording as both reference and target",
  limitation: "self-reference does not measure alternate-recording generalization; use a separate target recording for that claim",
  configuration: { dtwImplementation: dtwImplementation || "full-matrix", useReferenceAnchors },
  privacy: "metadata, local paths and generated timestamps/metrics only; source media and lyric text were not copied",
  root,
  summary: { discoveredCases: cases.length, evaluatedCases: evaluated.length, failedCases: cases.filter((item) => item.status === "failed").length },
  aggregate: allErrors.length ? scoreTimestamps(allErrors, allErrors.map(() => 0)) : null,
  cases,
};
await mkdir(resolve(output, ".."), { recursive: true });
await writeFile(output, JSON.stringify(document, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ output, summary: document.summary, aggregate: document.aggregate }, null, 2));

async function evaluateCase(caseRoot, id) {
  try {
    const files = await readdir(caseRoot, { withFileTypes: true });
    const audio = files.filter((entry) => entry.isFile() && audioExtensions.has(extname(entry.name).toLowerCase())).sort((a, b) => a.name.localeCompare(b.name))[0];
    const lyricsCandidates = files.filter((entry) => entry.isFile() && lyricExtensions.has(extname(entry.name).toLowerCase())).sort((a, b) => a.name.localeCompare(b.name));
    const lyric = lyricsCandidates.find((entry) => entry.name.toLowerCase() === "lyrics.lrc") || lyricsCandidates[0];
    const reference = JSON.parse(await readFile(join(caseRoot, "reference.json"), "utf8"));
    if (!audio || !lyric || reference.verified !== true) return { id, status: "skipped", reason: "requires_audio_lyric_and_verified_reference" };
    const decoded = await decodeAudioFile(join(caseRoot, audio.name));
    const lyrics = parseLyrics(await readFile(join(caseRoot, lyric.name), "utf8"), "reference_template_self_evaluation");
    const starts = (reference.startTimes || []).map(Number);
    if (starts.length !== lyrics.lines.length) return { id, status: "failed", reason: "reference_line_count_does_not_match_lyrics" };
    const mfcc = await loadOrExtractMfcc({ audioPath: join(caseRoot, audio.name), decoded, cache: featureCache, enabled: process.env.LYRICSYNC_DISABLE_FEATURE_CACHE !== "1" });
    const started = performance.now();
    const result = alignWithReferenceTemplates({ referenceSamples: decoded.samples, referenceSampleRate: decoded.sampleRate, referenceStarts: starts, referenceDuration: decoded.duration, targetSamples: decoded.samples, targetSampleRate: decoded.sampleRate, targetDuration: decoded.duration, lyrics: lyrics.lines, options: { dtwImplementation, useReferenceAnchors, referenceMfcc: mfcc, targetMfcc: mfcc } });
    const predicted = result.lines.map((line) => line.startTime);
    const metrics = scoreTimestamps(predicted, starts);
    return { id, status: "evaluated", audioPath: join(caseRoot, audio.name), lyricPath: join(caseRoot, lyric.name), lineCount: starts.length, runtimeMs: performance.now() - started, metrics, confidence: { mean: result.lines.reduce((sum, line) => sum + (line.confidence || 0), 0) / result.lines.length, reviewRequired: result.lines.filter((line) => line.reviewRequired).length, calibration: summarizeConfidence(predicted, starts, result.lines.map((line) => line.confidence)) }, diagnostics: result.alignment.diagnostics };
  } catch (error) {
    return { id, status: "failed", reason: error.code || error.message || "evaluation_failed" };
  }
}
