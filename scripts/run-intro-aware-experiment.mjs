import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { synchronize } from "../src/engine.js";
import { scoreTimestamps } from "../src/metrics.js";

const inputPath = process.argv[2] || "benchmarks/results/robustness-study.json";
const outputPath = process.argv[3] || "benchmarks/results/intro-aware-study.json";
const dataset = JSON.parse(await readFile(resolve(inputPath), "utf8"));
const started = performance.now();
const methods = ["boundaryDp", "introAwareBoundaryDp"];
const predictions = Object.fromEntries(methods.map((name) => [name, []]));
const reference = [];
const cases = [];

for (const item of dataset.cases) {
  if (!item.profiles?.energy) throw new Error("Robustness results must include profiles; rerun experiment-robustness first.");
  const lines = item.reference.map((_, order) => ({ id: `${item.id}-${order}`, originalText: `line-${order + 1}`, order }));
  const results = {
    boundaryDp: synchronize({ lyrics: lines, engine: "boundary-dp", energyProfile: item.profiles.energy, duration: item.duration, parameters: { profile: item.profiles.energy } }),
    introAwareBoundaryDp: synchronize({ lyrics: lines, engine: "intro-aware-boundary-dp", energyProfile: item.profiles.energy, duration: item.duration, parameters: { profile: item.profiles.energy } }),
  };
  const casePredictions = {};
  for (const name of methods) {
    casePredictions[name] = results[name].lines.map((line) => line.startTime);
    predictions[name].push(...casePredictions[name]);
  }
  reference.push(...item.reference);
  cases.push({ id: item.id, reference: item.reference, introFrame: results.introAwareBoundaryDp.alignment.introFrame, introTime: results.introAwareBoundaryDp.alignment.introTime, predictions: casePredictions });
}

const metrics = Object.fromEntries(methods.map((name) => [name, scoreTimestamps(predictions[name], reference)]));
const output = { datasetVersion: "intro-aware-synthetic-v1", input: inputPath, description: "Comparison of existing Boundary-DP with an intro-aware variant on deterministic robustness cases.", caseCount: cases.length, methods, metrics, cases, runtimeMs: performance.now() - started, generatedAt: new Date().toISOString() };
await mkdir(dirname(resolve(outputPath)), { recursive: true });
await writeFile(resolve(outputPath), JSON.stringify(output, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ output: outputPath, metrics, cases: cases.map(({ id, introFrame, introTime }) => ({ id, introFrame, introTime })) }, null, 2));
