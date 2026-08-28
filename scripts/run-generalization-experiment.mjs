import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { synchronize } from "../src/engine.js";
import { scoreTimestamps } from "../src/metrics.js";

const outputPath = process.argv[2] || "benchmarks/results/generalization-study.json";
const methodNames = ["energyBaseline", "combinedProfile", "boundaryDp", "multiProfileBoundaryDp"];
const random = seededRandom(20260828);
const cases = Array.from({ length: 60 }, (_, index) => createCase(index + 1, random));
const started = performance.now();
const aggregate = Object.fromEntries(methodNames.map((name) => [name, { predicted: [], reference: [] }]));
const failures = Object.fromEntries(methodNames.map((name) => [name, 0]));
const caseReports = [];

for (const item of cases) {
  const lines = item.lyrics.map((originalText, order) => ({ id: `${item.id}-${order}`, originalText, order }));
  const predictions = {};
  for (const name of methodNames) {
    try {
      const result = runMethod(name, item, lines);
      predictions[name] = result.lines.map((line) => line.startTime);
      aggregate[name].predicted.push(...predictions[name]);
      aggregate[name].reference.push(...item.reference);
    } catch (error) {
      failures[name] += 1;
      predictions[name] = null;
    }
  }
  caseReports.push({ id: item.id, lineCount: item.lyrics.length, frameCount: item.frameCount, duration: item.duration, introFrames: item.introFrames, noiseAmplitude: item.noiseAmplitude, onsetShift: item.onsetShift, reference: item.reference, predictions });
}

const metrics = Object.fromEntries(methodNames.map((name) => [name, aggregate[name].predicted.length ? scoreTimestamps(aggregate[name].predicted, aggregate[name].reference) : null]));
const output = {
  datasetVersion: "generalization-synthetic-v1",
  description: "Seeded randomized line-boundary corpus; no copyrighted audio.",
  caseCount: cases.length,
  totalLineStarts: cases.reduce((sum, item) => sum + item.reference.length, 0),
  methods: methodNames,
  metrics,
  failures,
  cases: caseReports,
  runtimeMs: performance.now() - started,
  generatedAt: new Date().toISOString(),
};

await mkdir(dirname(resolve(outputPath)), { recursive: true });
await writeFile(resolve(outputPath), JSON.stringify(output, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ output: outputPath, caseCount: output.caseCount, totalLineStarts: output.totalLineStarts, metrics, failures }, null, 2));

function runMethod(name, item, lines) {
  if (name === "energyBaseline") return synchronize({ lyrics: lines, energyProfile: item.profiles.energy, duration: item.duration });
  if (name === "combinedProfile") return synchronize({ lyrics: lines, engine: "combined-profile", energyProfile: item.profiles.energy, duration: item.duration, parameters: { profiles: item.profiles, weights: { energy: 0.65, spectralFlux: 0.35 } } });
  if (name === "boundaryDp") return synchronize({ lyrics: lines, engine: "boundary-dp", energyProfile: item.profiles.energy, duration: item.duration, parameters: { profile: item.profiles.energy } });
  return synchronize({ lyrics: lines, engine: "multi-profile-boundary-dp", duration: item.duration, parameters: { profiles: item.profiles, weights: { energy: 0.5, spectralFlux: 0.3, voicedness: 0.2 } } });
}

function createCase(index, random) {
  const frameCount = 72 + Math.floor(random() * 49);
  const lineCount = 3 + Math.floor(random() * 6);
  const duration = Math.round((24 + random() * 66) * 100) / 100;
  const introFrames = Math.floor(random() * 9);
  const available = frameCount - introFrames;
  const minimum = 5;
  const lengths = Array.from({ length: lineCount }, () => minimum);
  for (let remaining = available - minimum * lineCount; remaining > 0; remaining--) lengths[Math.floor(random() * lineCount)] += 1;
  const referenceFrames = [];
  let cursor = introFrames;
  for (const length of lengths) {
    referenceFrames.push(cursor);
    cursor += length;
  }
  const noiseAmplitude = Math.round(random() * 0.35 * 100) / 100;
  const onsetShift = Math.floor(random() * 5) - 1;
  const profiles = {
    energy: makeProfile(frameCount, referenceFrames, random, noiseAmplitude, onsetShift, 1),
    spectralFlux: makeProfile(frameCount, referenceFrames, random, noiseAmplitude, onsetShift, 0.85),
    voicedness: makeProfile(frameCount, referenceFrames, random, noiseAmplitude, onsetShift, 0.72),
  };
  return {
    id: `general-${String(index).padStart(3, "0")}`,
    frameCount,
    duration,
    introFrames,
    noiseAmplitude,
    onsetShift,
    lyrics: Array.from({ length: lineCount }, (_, line) => `line-${line + 1}`),
    reference: referenceFrames.map((frame) => frame / frameCount * duration),
    profiles,
  };
}

function makeProfile(frameCount, boundaries, random, noiseAmplitude, onsetShift, peakScale) {
  return Array.from({ length: frameCount }, (_, frame) => {
    const distance = boundaries.reduce((best, boundary) => Math.min(best, Math.abs(frame - boundary - onsetShift)), Infinity);
    const shape = distance === 0 ? 1 : distance === 1 ? 0.42 : distance === 2 ? 0.18 : 0.05;
    const noise = (random() - 0.5) * noiseAmplitude;
    return Math.max(0, 0.1 + shape * peakScale + noise);
  });
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
