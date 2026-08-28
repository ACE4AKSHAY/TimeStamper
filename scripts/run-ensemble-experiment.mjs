import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { synchronize } from "../src/engine.js";
import { scoreTimestamps } from "../src/metrics.js";

const inputPath = process.argv[2] || "benchmarks/example.ensemble.synthetic.json";
const outputPath = process.argv[3] || "benchmarks/results/ensemble-boundary-study.json";
const dataset = JSON.parse(await readFile(resolve(inputPath), "utf8"));
const methods = { adaptiveBoundaryDp: [], refinedBoundaryDp: [], ensembleBoundary: [] }, references = [];
for (const item of dataset.cases) {
  const lines = item.lyrics.map((originalText, order) => ({ id: `${item.id}-${order}`, originalText, order }));
  const parameters = { profile: item.profile, boundaryWeight: 0, minimumIntroFrames: item.profile.length + 1, windowFrames: 4 };
  methods.adaptiveBoundaryDp.push(...synchronize({ lyrics: lines, duration: item.duration, engine: "adaptive-boundary-dp", parameters }).lines.map((line) => line.startTime));
  methods.refinedBoundaryDp.push(...synchronize({ lyrics: lines, duration: item.duration, engine: "refined-boundary-dp", parameters }).lines.map((line) => line.startTime));
  methods.ensembleBoundary.push(...synchronize({ lyrics: lines, duration: item.duration, engine: "ensemble-boundary", parameters }).lines.map((line) => line.startTime));
  references.push(...item.reference);
}
const metrics = Object.fromEntries(Object.entries(methods).map(([name, predicted]) => [name, scoreTimestamps(predicted, references)]));
const output = { datasetVersion: dataset.datasetVersion, description: "Comparison of coarse, locally refined, and consensus boundary candidates.", caseCount: dataset.cases.length, methods: Object.fromEntries(Object.entries(methods).map(([name, predicted]) => [name, { predicted, metrics: metrics[name] }])), input: inputPath, generatedAt: new Date().toISOString() };
await mkdir(dirname(resolve(outputPath)), { recursive: true });
await writeFile(resolve(outputPath), JSON.stringify(output, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ output: outputPath, metrics }, null, 2));
