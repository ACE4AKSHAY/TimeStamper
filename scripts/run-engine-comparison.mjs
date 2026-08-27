import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { synchronize } from "../src/engine.js";
import { scoreTimestamps } from "../src/metrics.js";

const inputPath = process.argv[2] || "benchmarks/example.synthetic.json";
const outputPath = process.argv[3] || "benchmarks/results/engine-comparison.json";
const dataset = JSON.parse(await readFile(resolve(inputPath), "utf8"));
const methods = { energyBaseline: [], combinedProfile: [] }, references = [];
const started = performance.now();
for (const item of dataset.cases) {
  const lines = item.lyrics.map((originalText, order) => ({ id: `${item.id}-${order}`, originalText, order }));
  methods.energyBaseline.push(...synchronize({ lyrics: lines, energyProfile: item.energy, duration: item.duration }).lines.map((line) => line.startTime));
  methods.combinedProfile.push(...synchronize({ lyrics: lines, engine: "combined-profile", duration: item.duration, parameters: { profiles: { energy: item.energy, spectralFlux: item.spectralFlux || item.flux || item.energy }, weights: { energy: 0.65, spectralFlux: 0.35 } } }).lines.map((line) => line.startTime));
  references.push(...item.reference);
}
const output = { datasetVersion: dataset.datasetVersion, caseCount: dataset.cases.length, weights: { energy: 0.65, spectralFlux: 0.35 }, runtimeMs: performance.now() - started, methods: Object.fromEntries(Object.entries(methods).map(([name, predicted]) => [name, { metrics: scoreTimestamps(predicted, references), predicted }])), input: inputPath, generatedAt: new Date().toISOString() };
await mkdir(dirname(resolve(outputPath)), { recursive: true });
await writeFile(resolve(outputPath), JSON.stringify(output, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ output: outputPath, methods: Object.fromEntries(Object.entries(output.methods).map(([name, value]) => [name, value.metrics])) }, null, 2));
