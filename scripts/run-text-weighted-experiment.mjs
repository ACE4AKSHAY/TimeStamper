import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { synchronize } from "../src/engine.js";
import { scoreTimestamps } from "../src/metrics.js";

const inputPath = process.argv[2] || "benchmarks/example.text-weighted.synthetic.json";
const outputPath = process.argv[3] || "benchmarks/results/text-weighted-boundary-study.json";
const dataset = JSON.parse(await readFile(resolve(inputPath), "utf8"));
const methods = { boundaryDp: [], textWeightedBoundaryDp: [] }, references = [];
for (const item of dataset.cases) {
  const lines = item.lyrics.map((originalText, order) => ({ id: `${item.id}-${order}`, originalText, order }));
  const common = { lyrics: lines, duration: item.duration, parameters: { profile: item.profile, boundaryWeight: 0 } };
  methods.boundaryDp.push(...synchronize({ ...common, engine: "boundary-dp" }).lines.map((line) => line.startTime));
  methods.textWeightedBoundaryDp.push(...synchronize({ ...common, engine: "text-weighted-boundary-dp" }).lines.map((line) => line.startTime));
  references.push(...item.reference);
}
const metrics = Object.fromEntries(Object.entries(methods).map(([name, predicted]) => [name, scoreTimestamps(predicted, references)]));
const output = { datasetVersion: dataset.datasetVersion, description: "Comparison of equal-duration and text-weighted Boundary-DP priors.", caseCount: dataset.cases.length, methods: Object.fromEntries(Object.entries(methods).map(([name, predicted]) => [name, { predicted, metrics: metrics[name] }])), input: inputPath, generatedAt: new Date().toISOString() };
await mkdir(dirname(resolve(outputPath)), { recursive: true });
await writeFile(resolve(outputPath), JSON.stringify(output, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ output: outputPath, metrics }, null, 2));
