import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { synchronize } from "../src/engine.js";
import { scoreTimestamps } from "../src/metrics.js";

const inputPath = process.argv[2] || "benchmarks/example.multi-profile.synthetic.json";
const outputPath = process.argv[3] || "benchmarks/results/ablation-study.json";
const dataset = JSON.parse(await readFile(resolve(inputPath), "utf8"));
const methodNames = ["energyBaseline", "combinedProfile", "boundaryDp", "multiProfileBoundaryDp"];
const predictions = Object.fromEntries(methodNames.map((name) => [name, []]));
const reference = [], cases = [], started = performance.now();
for (const item of dataset.cases) {
  const lines = item.lyrics.map((originalText, order) => ({ id: `${item.id}-${order}`, originalText, order }));
  const profiles = item.profiles || { energy: item.energy || [], spectralFlux: item.spectralFlux || item.flux || item.energy || [], voicedness: item.voicedness || item.energy || [] };
  const results = {
    energyBaseline: synchronize({ lyrics: lines, energyProfile: profiles.energy, duration: item.duration }),
    combinedProfile: synchronize({ lyrics: lines, engine: "combined-profile", energyProfile: profiles.energy, duration: item.duration, parameters: { profiles: { energy: profiles.energy, spectralFlux: profiles.spectralFlux }, weights: { energy: 0.65, spectralFlux: 0.35 } } }),
    boundaryDp: synchronize({ lyrics: lines, engine: "boundary-dp", energyProfile: profiles.energy, duration: item.duration, parameters: { profile: profiles.energy } }),
    multiProfileBoundaryDp: synchronize({ lyrics: lines, engine: "multi-profile-boundary-dp", duration: item.duration, parameters: { profiles, weights: dataset.weights || { energy: 0.5, spectralFlux: 0.3, voicedness: 0.2 } } }),
  };
  const casePredictions = {};
  for (const name of methodNames) { casePredictions[name] = results[name].lines.map((line) => line.startTime); predictions[name].push(...casePredictions[name]); }
  reference.push(...item.reference);
  cases.push({ id: item.id, reference: item.reference, predictions: casePredictions });
}
const metrics = Object.fromEntries(methodNames.map((name) => [name, scoreTimestamps(predictions[name], reference)]));
const baselineMae = metrics.energyBaseline.maeSeconds;
const analysis = Object.fromEntries(methodNames.map((name) => [name, { maeDeltaVsEnergyBaselineSeconds: metrics[name].maeSeconds - baselineMae, improvesMaeVsEnergyBaseline: metrics[name].maeSeconds < baselineMae }]));
const output = { datasetVersion: dataset.datasetVersion, caseCount: dataset.cases.length, methods: methodNames, metrics, analysis, runtimeMs: performance.now() - started, cases, input: inputPath, generatedAt: new Date().toISOString() };
await mkdir(dirname(resolve(outputPath)), { recursive: true });
await writeFile(resolve(outputPath), JSON.stringify(output, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ output: outputPath, metrics, analysis }, null, 2));
