import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { synchronize } from "../src/engine.js";
import { scoreTimestamps } from "../src/metrics.js";

const inputPath = process.argv[2] || "benchmarks/example.multi-profile.synthetic.json";
const outputPath = process.argv[3] || "benchmarks/results/parameter-sweep.json";
const dataset = JSON.parse(await readFile(resolve(inputPath), "utf8"));
const started = performance.now();

const boundaryCandidates = [];
for (const durationWeight of [0.25, 0.5, 1, 2, 4]) {
  for (const boundaryWeight of [0, 0.4, 0.8, 1.6, 3]) boundaryCandidates.push({ durationWeight, boundaryWeight });
}
const combinedCandidates = [0.2, 0.35, 0.5, 0.65, 0.8].map((energy) => ({ energy, spectralFlux: 1 - energy }));
const multiCandidates = [];
for (const energy of [0.2, 0.5, 0.8]) {
  for (const spectralFlux of [0.1, 0.3, 0.5]) {
    for (const voicedness of [0.1, 0.2, 0.4]) multiCandidates.push({ energy, spectralFlux, voicedness });
  }
}

const output = {
  datasetVersion: "parameter-sweep-synthetic-v1",
  input: inputPath,
  description: "Deterministic parameter sensitivity study; no copyrighted audio.",
  caseCount: dataset.cases.length,
  searches: {
    boundaryDp: boundaryCandidates,
    combinedProfile: combinedCandidates,
    multiProfileBoundaryDp: multiCandidates,
  },
  results: {
    boundaryDp: evaluateBoundary(boundaryCandidates),
    combinedProfile: evaluateCombined(combinedCandidates),
    multiProfileBoundaryDp: evaluateMulti(multiCandidates),
  },
  runtimeMs: performance.now() - started,
  generatedAt: new Date().toISOString(),
};

await mkdir(dirname(resolve(outputPath)), { recursive: true });
await writeFile(resolve(outputPath), JSON.stringify(output, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ output: outputPath, best: Object.fromEntries(Object.entries(output.results).map(([name, result]) => [name, result.best])) }, null, 2));

function evaluateBoundary(candidates) {
  return rank(candidates.map((parameters) => ({ parameters, metrics: scoreMethods((item, lines) => synchronize({ lyrics: lines, engine: "boundary-dp", energyProfile: item.profiles.energy, duration: item.duration, parameters: { profile: item.profiles.energy, ...parameters } })) })));
}

function evaluateCombined(candidates) {
  return rank(candidates.map((weights) => ({ weights, metrics: scoreMethods((item, lines) => synchronize({ lyrics: lines, engine: "combined-profile", energyProfile: item.profiles.energy, duration: item.duration, parameters: { profiles: item.profiles, weights } })) })));
}

function evaluateMulti(candidates) {
  return rank(candidates.map((weights) => ({ weights, metrics: scoreMethods((item, lines) => synchronize({ lyrics: lines, engine: "multi-profile-boundary-dp", duration: item.duration, parameters: { profiles: item.profiles, weights } })) })));
}

function scoreMethods(predict, collectDetails = false) {
  const predicted = [], reference = [];
  for (const item of dataset.cases) {
    const lines = item.lyrics.map((originalText, order) => ({ id: `${item.id}-${order}`, originalText, order }));
    const profiles = item.profiles || { energy: item.energy || [], spectralFlux: item.spectralFlux || item.energy || [], voicedness: item.voicedness || item.energy || [] };
    const result = predict({ ...item, profiles }, lines);
    predicted.push(...result.lines.map((line) => line.startTime));
    reference.push(...item.reference);
  }
  const metrics = scoreTimestamps(predicted, reference);
  return collectDetails ? { metrics, predicted, reference } : metrics;
}

function rank(entries) {
  const ranked = entries.sort((left, right) => left.metrics.maeSeconds - right.metrics.maeSeconds || left.metrics.rmseSeconds - right.metrics.rmseSeconds);
  return { candidateCount: ranked.length, best: ranked[0], topFive: ranked.slice(0, 5) };
}
