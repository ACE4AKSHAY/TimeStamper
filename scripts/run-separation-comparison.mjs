import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { decodeAudioFile } from "../src/audio-decoder.mjs";
import { buildEvaluationParameters, DEFAULT_EVALUATION_ENGINES, extractReferenceStarts } from "../src/evaluation.js";
import { FeatureCache } from "../src/feature-cache.mjs";
import { loadOrExtractAudioFeatures } from "../src/audio-feature-cache.mjs";
import { parseLyrics } from "../src/lyrics.js";
import { scoreTimestamps } from "../src/metrics.js";
import { synchronize } from "../src/engine.js";

const [fullMixArg, vocalArg, lyricArg, referenceArg, outputArg = "benchmarks/private/vocal-separation-comparison.json"] = process.argv.slice(2);
if (!fullMixArg || !vocalArg || !lyricArg || !referenceArg) throw new Error("Usage: node scripts/run-separation-comparison.mjs <full-mix-audio> <vocal-audio> <lyrics> <reference-json> [output-json]");
const fullMixPath = resolve(fullMixArg), vocalPath = resolve(vocalArg), lyricPath = resolve(lyricArg), referencePath = resolve(referenceArg), output = resolve(outputArg);
const engines = process.env.LYRICSYNC_ENGINES ? process.env.LYRICSYNC_ENGINES.split(",").map((value) => value.trim()).filter(Boolean) : DEFAULT_EVALUATION_ENGINES;
const cache = new FeatureCache(process.env.LYRICSYNC_FEATURE_CACHE_DIR || "cache/features");
const [fullMix, vocal, lyricsText, reference] = await Promise.all([
  decodeAudioFile(fullMixPath), decodeAudioFile(vocalPath), readFile(lyricPath, "utf8"), readFile(referencePath, "utf8").then(JSON.parse),
]);
const lyrics = parseLyrics(lyricsText, "separation_comparison");
const starts = extractReferenceStarts(reference);
if (starts.length !== lyrics.lines.length) throw new Error(`Reference line count (${starts.length}) does not match lyrics (${lyrics.lines.length}).`);
const results = {};
for (const [label, audioPath, decoded] of [["full_mix", fullMixPath, fullMix], ["vocal_separated", vocalPath, vocal]]) {
  const features = await loadOrExtractAudioFeatures({ audioPath, decoded, cache, enabled: process.env.LYRICSYNC_DISABLE_FEATURE_CACHE !== "1" });
  results[label] = {};
  for (const engine of engines) {
    const started = performance.now();
    const result = synchronize({ lyrics: lyrics.lines, duration: decoded.duration, energyProfile: features.profiles.energy, engine, parameters: buildEvaluationParameters(engine, features.profiles, features.voicedness) });
    const predicted = result.lines.map((line) => line.startTime);
    results[label][engine] = { metrics: scoreTimestamps(predicted, starts), runtimeMs: performance.now() - started };
  }
}
const comparison = Object.fromEntries(engines.map((engine) => {
  const full = results.full_mix[engine].metrics, separated = results.vocal_separated[engine].metrics;
  return [engine, { fullMix: full, vocalSeparated: separated, maeImprovementSeconds: full.maeSeconds - separated.maeSeconds, within100Improvement: separated.within100 - full.within100 }];
}));
const document = { schemaVersion: 1, generatedAt: new Date().toISOString(), privacy: "local paths and generated metrics only; source media and lyric text were not copied", inputs: { fullMixPath, vocalPath: vocalArg ? vocalPath : null, lyricPath, referencePath }, engines, decoder: { fullMix: fullMix.format, vocalSeparated: vocal.format }, lineCount: lyrics.lines.length, comparison, results };
await mkdir(resolve(output, ".."), { recursive: true });
await writeFile(output, JSON.stringify(document, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ output, lineCount: document.lineCount, engines, comparison }, null, 2));
