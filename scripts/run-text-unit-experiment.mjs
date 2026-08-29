import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { synchronize } from "../src/engine.js";
import { scoreTimestamps } from "../src/metrics.js";

const inputPath = process.argv[2] || "benchmarks/example.text-weighted.synthetic.json";
const outputPath = process.argv[3] || "benchmarks/results/text-unit-study.json";
const dataset = JSON.parse(await readFile(resolve(inputPath), "utf8"));
const methods = { codepoint: [], grapheme: [] }, references = [];
for (const item of dataset.cases) {
  const lines = item.lyrics.map((originalText, order) => ({ id: `${item.id}-${order}`, originalText, order }));
  for (const textUnit of Object.keys(methods)) {
    methods[textUnit].push(...synchronize({ lyrics: lines, duration: item.duration, engine: "text-weighted-boundary-dp", parameters: { profile: item.profile, boundaryWeight: 0, textUnit } }).lines.map((line) => line.startTime));
  }
  references.push(...item.reference);
}
const metrics = Object.fromEntries(Object.entries(methods).map(([name, predicted]) => [name, scoreTimestamps(predicted, references)]));
const output = { datasetVersion: dataset.datasetVersion, description: "Comparison of Unicode codepoint and grapheme-cluster duration priors; both are deterministic and language-agnostic.", caseCount: dataset.cases.length, methods: Object.fromEntries(Object.entries(methods).map(([name, predicted]) => [name, { textUnit: name, predicted, metrics: metrics[name] }])), input: inputPath, generatedAt: new Date().toISOString() };
await mkdir(dirname(resolve(outputPath)), { recursive: true });
await writeFile(resolve(outputPath), JSON.stringify(output, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ output: outputPath, metrics }, null, 2));
