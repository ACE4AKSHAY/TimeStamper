import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { synchronize } from "../src/engine.js";
import { scoreTimestamps } from "../src/metrics.js";

const inputPath = process.argv[2] || "benchmarks/example.boundary.synthetic.json";
const outputPath = process.argv[3] || "benchmarks/results/boundary-dp.json";
const dataset = JSON.parse(await readFile(resolve(inputPath), "utf8"));
const predicted = [], reference = [], cases = [];
const started = performance.now();
for (const item of dataset.cases) {
  const lines = item.lyrics.map((originalText, order) => ({ id: `${item.id}-${order}`, originalText, order }));
  const result = synchronize({ lyrics: lines, engine: "boundary-dp", duration: item.duration, parameters: { profile: item.profile, minLength: item.minLength, maxLength: item.maxLength, durationWeight: item.durationWeight, boundaryWeight: item.boundaryWeight } });
  const starts = result.lines.map((line) => line.startTime);
  predicted.push(...starts); reference.push(...item.reference);
  cases.push({ id: item.id, starts, segments: result.alignment.segments, cost: result.alignment.cost });
}
const output = { datasetVersion: dataset.datasetVersion, caseCount: dataset.cases.length, method: "boundary_dynamic_programming", runtimeMs: performance.now() - started, metrics: scoreTimestamps(predicted, reference), cases, input: inputPath, generatedAt: new Date().toISOString() };
await mkdir(dirname(resolve(outputPath)), { recursive: true });
await writeFile(resolve(outputPath), JSON.stringify(output, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ output: outputPath, method: output.method, metrics: output.metrics }, null, 2));
