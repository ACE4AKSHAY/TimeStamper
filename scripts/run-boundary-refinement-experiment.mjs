import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { synchronize } from "../src/engine.js";
import { scoreTimestamps } from "../src/metrics.js";

const inputPath = process.argv[2] || "benchmarks/example.refinement.synthetic.json";
const outputPath = process.argv[3] || "benchmarks/results/boundary-refinement-study.json";
const dataset = JSON.parse(await readFile(resolve(inputPath), "utf8"));
const methods = { adaptiveBoundaryDp: [], refinedBoundaryDp: [] }, references = [];
for (const item of dataset.cases) {
  const lines = item.lyrics.map((originalText, order) => ({ id: `${item.id}-${order}`, originalText, order }));
  const common = { lyrics: lines, duration: item.duration, parameters: { profile: item.profile, boundaryWeight: 0, minimumIntroFrames: item.profile.length + 1, windowFrames: 4 } };
  methods.adaptiveBoundaryDp.push(...synchronize({ ...common, engine: "adaptive-boundary-dp" }).lines.map((line) => line.startTime));
  methods.refinedBoundaryDp.push(...synchronize({ ...common, engine: "refined-boundary-dp" }).lines.map((line) => line.startTime));
  references.push(...item.reference);
}
const metrics = Object.fromEntries(Object.entries(methods).map(([name, predicted]) => [name, scoreTimestamps(predicted, references)]));
const output = { datasetVersion: dataset.datasetVersion, description: "Comparison of coarse adaptive Boundary-DP and local onset refinement.", caseCount: dataset.cases.length, methods: Object.fromEntries(Object.entries(methods).map(([name, predicted]) => [name, { predicted, metrics: metrics[name] }])), input: inputPath, generatedAt: new Date().toISOString() };
await mkdir(dirname(resolve(outputPath)), { recursive: true });
await writeFile(resolve(outputPath), JSON.stringify(output, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ output: outputPath, metrics }, null, 2));
