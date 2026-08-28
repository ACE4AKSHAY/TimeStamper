import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { synchronize } from "../src/engine.js";
import { scoreTimestamps } from "../src/metrics.js";

const inputPath = process.argv[2] || "benchmarks/results/robustness-study.json";
const outputPath = process.argv[3] || "benchmarks/results/adaptive-boundary-study.json";
const dataset = JSON.parse(await readFile(resolve(inputPath), "utf8"));
const started = performance.now();
const methods = ["boundaryDp", "introAwareBoundaryDp", "adaptiveBoundaryDp"];
const predictions = Object.fromEntries(methods.map((name) => [name, []]));
const reference = [];
const cases = [];

for (const item of dataset.cases) {
  if (!item.profiles?.energy || !Number.isFinite(item.duration)) throw new Error("Run experiment-robustness first so profiles and durations are available.");
  const lines = item.reference.map((_, order) => ({ id: `${item.id}-${order}`, originalText: `line-${order + 1}`, order }));
  const baseParameters = { profile: item.profiles.energy };
  const results = {
    boundaryDp: synchronize({ lyrics: lines, engine: "boundary-dp", energyProfile: item.profiles.energy, duration: item.duration, parameters: baseParameters }),
    introAwareBoundaryDp: synchronize({ lyrics: lines, engine: "intro-aware-boundary-dp", energyProfile: item.profiles.energy, duration: item.duration, parameters: baseParameters }),
    adaptiveBoundaryDp: synchronize({ lyrics: lines, engine: "adaptive-boundary-dp", energyProfile: item.profiles.energy, duration: item.duration, parameters: { ...baseParameters, minimumIntroFrames: 3 } }),
  };
  const casePredictions = {};
  for (const name of methods) {
    casePredictions[name] = results[name].lines.map((line) => line.startTime);
    predictions[name].push(...casePredictions[name]);
  }
  reference.push(...item.reference);
  cases.push({ id: item.id, reference: item.reference, introFrame: results.introAwareBoundaryDp.alignment.introFrame, selectedEngine: results.adaptiveBoundaryDp.alignment.selectedEngine, predictions: casePredictions });
}

const metrics = Object.fromEntries(methods.map((name) => [name, scoreTimestamps(predictions[name], reference)]));
const output = { datasetVersion: "adaptive-boundary-synthetic-v1", input: inputPath, description: "Comparison of Boundary-DP, intro-aware Boundary-DP, and a thresholded adaptive selector.", caseCount: cases.length, methods, metrics, cases, runtimeMs: performance.now() - started, generatedAt: new Date().toISOString() };
await mkdir(dirname(resolve(outputPath)), { recursive: true });
await writeFile(resolve(outputPath), JSON.stringify(output, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ output: outputPath, metrics, selections: cases.map(({ id, introFrame, selectedEngine }) => ({ id, introFrame, selectedEngine })) }, null, 2));
