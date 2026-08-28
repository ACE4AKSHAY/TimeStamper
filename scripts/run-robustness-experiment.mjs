import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { synchronize } from "../src/engine.js";
import { scoreTimestamps } from "../src/metrics.js";

const outputPath = process.argv[2] || "benchmarks/results/robustness-study.json";
const methodNames = ["energyBaseline", "combinedProfile", "boundaryDp", "multiProfileBoundaryDp"];

const scenarios = [
  createScenario("clean", 60, [0, 12, 24, 36, 48], 30, { noise: 0 }),
  createScenario("deterministic-noise", 60, [0, 12, 24, 36, 48], 30, { noise: 0.28 }),
  createScenario("delayed-onsets", 60, [0, 12, 24, 36, 48], 30, { peakShift: 2 }),
  createScenario("long-intro", 80, [10, 24, 38, 52, 66], 40, { noise: 0.08 }),
  createScenario("uneven-line-lengths", 80, [0, 6, 24, 40, 64], 40, { noise: 0.05 }),
];

const started = performance.now();
const cases = [];
const aggregate = Object.fromEntries(methodNames.map((name) => [name, { predicted: [], reference: [] }]));

for (const scenario of scenarios) {
  const lines = scenario.lyrics.map((originalText, order) => ({ id: `${scenario.id}-${order}`, originalText, order }));
  const profiles = scenario.profiles;
  const results = {
    energyBaseline: synchronize({ lyrics: lines, energyProfile: profiles.energy, duration: scenario.duration }),
    combinedProfile: synchronize({ lyrics: lines, engine: "combined-profile", energyProfile: profiles.energy, duration: scenario.duration, parameters: { profiles: { energy: profiles.energy, spectralFlux: profiles.spectralFlux }, weights: { energy: 0.65, spectralFlux: 0.35 } } }),
    boundaryDp: synchronize({ lyrics: lines, engine: "boundary-dp", energyProfile: profiles.energy, duration: scenario.duration, parameters: { profile: profiles.energy } }),
    multiProfileBoundaryDp: synchronize({ lyrics: lines, engine: "multi-profile-boundary-dp", duration: scenario.duration, parameters: { profiles, weights: { energy: 0.5, spectralFlux: 0.3, voicedness: 0.2 } } }),
  };
  const predictions = {};
  for (const name of methodNames) {
    predictions[name] = results[name].lines.map((line) => line.startTime);
    aggregate[name].predicted.push(...predictions[name]);
    aggregate[name].reference.push(...scenario.reference);
  }
  cases.push({ id: scenario.id, description: scenario.description, reference: scenario.reference, predictions, profileNotes: scenario.profileNotes });
}

const metrics = Object.fromEntries(methodNames.map((name) => [name, scoreTimestamps(aggregate[name].predicted, aggregate[name].reference)]));
const perScenarioMetrics = Object.fromEntries(cases.map((item) => [item.id, Object.fromEntries(methodNames.map((name) => [name, scoreTimestamps(item.predictions[name], item.reference)]))]));
const output = {
  datasetVersion: "robustness-synthetic-v1",
  description: "Deterministic perturbation study for known line boundaries; no copyrighted audio.",
  scenarios: scenarios.length,
  methods: methodNames,
  metrics,
  perScenarioMetrics,
  cases,
  runtimeMs: performance.now() - started,
  generatedAt: new Date().toISOString(),
};

await mkdir(dirname(resolve(outputPath)), { recursive: true });
await writeFile(resolve(outputPath), JSON.stringify(output, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ output: outputPath, metrics, perScenarioMetrics }, null, 2));

function createScenario(id, frameCount, boundaries, duration, options) {
  const lyrics = ["ఒకటి", "दो", "three", "四", "cinco"].slice(0, boundaries.length);
  const profiles = {
    energy: makeProfile(frameCount, boundaries, options),
    spectralFlux: makeProfile(frameCount, boundaries, { ...options, peakScale: 0.86, phase: 1 }),
    voicedness: makeProfile(frameCount, boundaries, { ...options, peakScale: 0.72, phase: 2 }),
  };
  return {
    id,
    description: describeScenario(id),
    duration,
    lyrics,
    reference: boundaries.map((frame) => frame / frameCount * duration),
    profiles,
    profileNotes: { frameCount, peakShift: options.peakShift || 0, noiseAmplitude: options.noise || 0 },
  };
}

function makeProfile(frameCount, boundaries, options = {}) {
  const peakScale = options.peakScale || 1;
  const phase = options.phase || 0;
  const shift = options.peakShift || 0;
  const noise = options.noise || 0;
  return Array.from({ length: frameCount }, (_, frame) => {
    const nearest = boundaries.reduce((best, boundary) => Math.min(best, Math.abs(frame - boundary - shift)), Infinity);
    const shape = nearest === 0 ? 1 : nearest === 1 ? 0.45 : 0.08;
    const deterministicNoise = noise * (((frame * 17 + phase * 11) % 19) / 18 - 0.5);
    return Math.max(0, 0.12 + peakScale * shape + deterministicNoise);
  });
}

function describeScenario(id) {
  return {
    clean: "Clean onset peaks at every known boundary.",
    "deterministic-noise": "Same boundaries with bounded deterministic profile noise.",
    "delayed-onsets": "Acoustic peaks occur two frames after the annotated lyric starts.",
    "long-intro": "The first lyric begins after a silent/intro region.",
    "uneven-line-lengths": "Line durations vary substantially instead of being uniform.",
  }[id];
}
