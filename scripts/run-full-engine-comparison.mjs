import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { synchronize } from "../src/engine.js";
import { scoreTimestamps } from "../src/metrics.js";

const outputPath = process.argv[2] || "benchmarks/results/full-engine-comparison.json";
const methodNames = ["energyBaseline", "combinedProfile", "boundaryDp", "multiProfileBoundaryDp", "textWeightedBoundaryDp", "refinedBoundaryDp", "vocalGatedBoundaryDp", "adaptiveVocalBoundaryDp", "ensembleBoundary", "silenceAwareBoundaryDp"];
const random = seededRandom(20260829);
const cases = Array.from({ length: 60 }, (_, index) => createCase(index + 1, random));
const started = performance.now();
const aggregate = Object.fromEntries(methodNames.map((name) => [name, { predicted: [], reference: [] }]));
const failures = Object.fromEntries(methodNames.map((name) => [name, 0]));
for (const item of cases) {
  const lines = item.lyrics.map((originalText, order) => ({ id: `${item.id}-${order}`, originalText, order }));
  for (const name of methodNames) {
    try {
      const result = runMethod(name, item, lines);
      aggregate[name].predicted.push(...result.lines.map((line) => line.startTime));
      aggregate[name].reference.push(...item.reference);
    } catch {
      failures[name] += 1;
    }
  }
}
const metrics = Object.fromEntries(methodNames.map((name) => [name, aggregate[name].predicted.length ? scoreTimestamps(aggregate[name].predicted, aggregate[name].reference) : null]));
const ranking = methodNames.filter((name) => metrics[name]).sort((a, b) => metrics[a].maeSeconds - metrics[b].maeSeconds).map((name, rank) => ({ rank: rank + 1, method: name, maeSeconds: metrics[name].maeSeconds, within100: metrics[name].within100 }));
const output = { datasetVersion: "full-engine-generalization-v1", description: "Seeded randomized comparison of every current deterministic alignment candidate; no copyrighted audio.", caseCount: cases.length, totalLineStarts: cases.reduce((sum, item) => sum + item.reference.length, 0), methods: methodNames, metrics, ranking, failures, corpus: { seed: 20260829, frameRange: [72, 120], durationRangeSeconds: [24, 90], variedIntros: true, noise: true, onsetShifts: true }, runtimeMs: performance.now() - started, generatedAt: new Date().toISOString() };
await mkdir(dirname(resolve(outputPath)), { recursive: true });
await writeFile(resolve(outputPath), JSON.stringify(output, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ output: outputPath, caseCount: output.caseCount, totalLineStarts: output.totalLineStarts, ranking, failures }, null, 2));

function runMethod(name, item, lines) {
  const common = { lyrics: lines, duration: item.duration, parameters: { profile: item.profiles.energy } };
  if (name === "energyBaseline") return synchronize({ lyrics: lines, energyProfile: item.profiles.energy, duration: item.duration });
  if (name === "combinedProfile") return synchronize({ ...common, engine: "combined-profile", parameters: { profiles: item.profiles, weights: { energy: 0.65, spectralFlux: 0.35 } } });
  if (name === "boundaryDp") return synchronize({ ...common, engine: "boundary-dp" });
  if (name === "multiProfileBoundaryDp") return synchronize({ ...common, engine: "multi-profile-boundary-dp", parameters: { profiles: item.profiles, weights: { energy: 0.5, spectralFlux: 0.3, voicedness: 0.2 } } });
  if (name === "textWeightedBoundaryDp") return synchronize({ ...common, engine: "text-weighted-boundary-dp" });
  if (name === "refinedBoundaryDp") return synchronize({ ...common, engine: "refined-boundary-dp", parameters: { profile: item.profiles.energy, windowFrames: 4 } });
  if (name === "vocalGatedBoundaryDp") return synchronize({ ...common, engine: "vocal-gated-boundary-dp", parameters: { profiles: item.profiles } });
  if (name === "adaptiveVocalBoundaryDp") return synchronize({ ...common, engine: "adaptive-vocal-boundary-dp", parameters: { profiles: item.profiles } });
  if (name === "ensembleBoundary") return synchronize({ ...common, engine: "ensemble-boundary", parameters: { profile: item.profiles.energy, windowFrames: 4 } });
  return synchronize({ ...common, engine: "silence-aware-boundary-dp" });
}

function createCase(index, random) {
  const frameCount = 72 + Math.floor(random() * 49), lineCount = 3 + Math.floor(random() * 6), duration = Math.round((24 + random() * 66) * 100) / 100, introFrames = Math.floor(random() * 9), available = frameCount - introFrames, lengths = Array.from({ length: lineCount }, () => 5);
  for (let remaining = available - 5 * lineCount; remaining > 0; remaining--) lengths[Math.floor(random() * lineCount)] += 1;
  const referenceFrames = [], cursorStart = introFrames;
  let cursor = cursorStart;
  for (const length of lengths) { referenceFrames.push(cursor); cursor += length; }
  const noiseAmplitude = Math.round(random() * 0.35 * 100) / 100, onsetShift = Math.floor(random() * 5) - 1;
  return { id: `full-${String(index).padStart(3, "0")}`, frameCount, duration, introFrames, lyrics: Array.from({ length: lineCount }, (_, line) => `line-${line + 1}`), reference: referenceFrames.map((frame) => frame / frameCount * duration), profiles: { energy: makeProfile(frameCount, referenceFrames, random, noiseAmplitude, onsetShift, 1), spectralFlux: makeProfile(frameCount, referenceFrames, random, noiseAmplitude, onsetShift, 0.85), voicedness: makeProfile(frameCount, referenceFrames, random, noiseAmplitude, onsetShift, 0.72) } };
}

function makeProfile(frameCount, boundaries, random, noiseAmplitude, onsetShift, peakScale) {
  return Array.from({ length: frameCount }, (_, frame) => { const distance = boundaries.reduce((best, boundary) => Math.min(best, Math.abs(frame - boundary - onsetShift)), Infinity); const shape = distance === 0 ? 1 : distance === 1 ? 0.42 : distance === 2 ? 0.18 : 0.05; return Math.max(0, 0.1 + shape * peakScale + (random() - 0.5) * noiseAmplitude); });
}

function seededRandom(seed) { let state = seed >>> 0; return () => { state = (1664525 * state + 1013904223) >>> 0; return state / 4294967296; }; }
