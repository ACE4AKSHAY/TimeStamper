import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { extractExplainableProfiles } from "../src/audio-profiles.js";
import { decodeAudioFile } from "../src/audio-decoder.mjs";
import { buildEvaluationParameters, DEFAULT_EVALUATION_ENGINES, extractReferenceStarts } from "../src/evaluation.js";
import { synchronize } from "../src/engine.js";
import { pitchVoicednessProfile, extractPitchProfile } from "../src/pitch-profile.js";
import { parseLyrics } from "../src/lyrics.js";
import { scoreTimestamps } from "../src/metrics.js";

const root = resolve(process.argv[2] || "benchmarks/private/verified-cases");
const output = resolve(process.argv[3] || "benchmarks/private/real-case-evaluation.json");
const engines = (process.argv[4] ? process.argv[4].split(",").map((value) => value.trim()).filter(Boolean) : DEFAULT_EVALUATION_ENGINES);
const audioExtensions = new Set([".mp3", ".m4a", ".wav", ".wave", ".flac", ".ogg", ".opus", ".aac"]);
const lyricExtensions = new Set([".lrc", ".txt"]);
const cases = [];
let entries = [];
try { entries = await readdir(root, { withFileTypes: true }); } catch { entries = []; }
for (const entry of entries.filter((item) => item.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
  cases.push(await evaluateCase(join(root, entry.name), entry.name));
}
const completed = cases.filter((item) => item.status === "evaluated");
const aggregate = Object.fromEntries(engines.map((engine) => {
  const errors = completed.flatMap((item) => item.engines[engine]?.metrics?.errorsSeconds || []);
  const metrics = errors.length ? scoreTimestamps(errors, errors.map(() => 0)) : null;
  return [engine, metrics ? { caseCount: completed.filter((item) => item.engines[engine]).length, lineCount: errors.length, maeSeconds: metrics.maeSeconds, medianAbsoluteErrorSeconds: metrics.medianAbsoluteErrorSeconds, within025: metrics.within025, within050: metrics.within050, within100: metrics.within100 } : { caseCount: 0, lineCount: 0, maeSeconds: null, medianAbsoluteErrorSeconds: null, within025: null, within050: null, within100: null }];
}));
const document = { schemaVersion: 1, generatedAt: new Date().toISOString(), privacy: "metadata, local paths and generated timestamps/metrics only; source media and lyric text were not copied", root, engines, summary: { discoveredCases: cases.length, evaluatedCases: completed.length, skippedCases: cases.filter((item) => item.status === "skipped").length, failedCases: cases.filter((item) => item.status === "failed").length }, aggregate, cases };
await import("node:fs/promises").then(({ mkdir }) => mkdir(resolve(output, ".."), { recursive: true }));
await writeFile(output, JSON.stringify(document, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ output, summary: document.summary, aggregate }, null, 2));

async function evaluateCase(caseRoot, id) {
  const files = await readdir(caseRoot, { withFileTypes: true });
  const audio = files.find((entry) => entry.isFile() && audioExtensions.has(extname(entry.name).toLowerCase()));
  const lyricCandidates = files
    .filter((entry) => entry.isFile() && lyricExtensions.has(extname(entry.name).toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));
  // Prefer the conventional name, then use a stable alphabetical order. This
  // keeps private benchmark runs reproducible when a folder contains a
  // duplicate export such as both "lyrics.lrc" and a song-named .lrc file.
  const lyric = lyricCandidates.find((entry) => entry.name.toLowerCase() === "lyrics.lrc") || lyricCandidates[0];
  const referencePath = join(caseRoot, "reference.json");
  if (!audio || !lyric) return { id, status: "skipped", reason: "case_requires_one_audio_file_and_one_lrc_or_txt_file" };
  let reference;
  try { reference = JSON.parse(await readFile(referencePath, "utf8")); } catch { return { id, status: "skipped", reason: "missing_or_invalid_reference_json" }; }
  if (reference.verified !== true && reference.timestampsVerified !== true && reference.review?.timestampsVerified !== true) return { id, status: "skipped", reason: "reference_not_marked_verified" };
  const audioPath = join(caseRoot, audio.name), lyricPath = join(caseRoot, lyric.name);
  try {
    const decoded = await decodeAudioFile(audioPath);
    const lyrics = parseLyrics(await readFile(lyricPath, "utf8"), "real_case_evaluation");
    const starts = extractReferenceStarts(reference);
    if (starts.length !== lyrics.lines.length) return { id, status: "failed", reason: "reference_line_count_does_not_match_lyrics", lyricLines: lyrics.lines.length, referenceLines: starts.length };
    if (starts.at(-1) > decoded.duration) return { id, status: "failed", reason: "reference_timestamp_exceeds_audio_duration" };
    const profiles = extractExplainableProfiles(decoded.samples, { bins: 700 });
    const pitch = extractPitchProfile(decoded.samples, decoded.sampleRate);
    const voicedness = pitchVoicednessProfile(pitch);
    const enginesOutput = {};
    for (const engine of engines) {
      const started = performance.now();
      const result = synchronize({ lyrics: lyrics.lines, duration: decoded.duration, energyProfile: profiles.energy, engine, parameters: buildEvaluationParameters(engine, profiles, voicedness) });
      const predicted = result.lines.map((line) => line.startTime);
      enginesOutput[engine] = { metrics: scoreTimestamps(predicted, starts), predicted, runtimeMs: performance.now() - started };
    }
    return { id, status: "evaluated", audioPath, lyricPath, lyricCandidates: lyricCandidates.map((entry) => entry.name), decoder: { format: decoded.format, sampleRate: decoded.sampleRate, duration: decoded.duration }, lyricLines: lyrics.lines.length, referenceLines: starts.length, engines: enginesOutput };
  } catch (error) {
    return { id, status: "failed", reason: error.code || error.message || "evaluation_failed" };
  }
}
