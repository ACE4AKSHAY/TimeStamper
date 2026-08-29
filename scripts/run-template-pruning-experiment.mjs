import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { synchronize } from "../src/engine.js";
import { scoreTimestamps } from "../src/metrics.js";

const inputPath = process.argv[2] || "benchmarks/example.template.synthetic.json";
const outputPath = process.argv[3] || "benchmarks/results/template-pruning-study.json";
const dataset = JSON.parse(await readFile(resolve(inputPath), "utf8"));
const variants = [
  { id: "exact", descriptorTopK: 0 },
  { id: "pruned-top-1", descriptorTopK: 1 },
  { id: "pruned-top-2", descriptorTopK: 2 },
];
const results = {};
for (const variant of variants) {
  const predicted = [], reference = [], cases = [];
  const started = performance.now();
  for (const item of dataset.cases) {
    const lines = item.lyrics.map((originalText, order) => ({ id: `${item.id}-${order}`, originalText, order }));
    const result = synchronize({ lyrics: lines, engine: "template-mfcc-dtw", parameters: { audioFrames: item.audioFrames, lineTemplates: item.lineTemplates, frameRate: item.frameRate, minLength: item.lineTemplates[0].length, maxLength: item.lineTemplates[0].length + 1, window: 2, descriptorTopK: variant.descriptorTopK } });
    const starts = result.lines.map((line) => line.startTime);
    predicted.push(...starts); reference.push(...item.reference);
    cases.push({ id: item.id, starts, cost: result.alignment.cost });
  }
  results[variant.id] = { descriptorTopK: variant.descriptorTopK, runtimeMs: performance.now() - started, metrics: scoreTimestamps(predicted, reference), cases };
}
const exact = results.exact;
const output = { datasetVersion: dataset.datasetVersion, description: "Exact versus cheap MFCC descriptor-pruned candidate search; deterministic synthetic fixture only.", input: inputPath, variants: results, comparison: Object.fromEntries(Object.entries(results).map(([id, result]) => [id, { maeDeltaSeconds: result.metrics.maeSeconds - exact.metrics.maeSeconds, runtimeRatioToExact: result.runtimeMs / Math.max(exact.runtimeMs, 1e-9) }])), generatedAt: new Date().toISOString() };
await mkdir(dirname(resolve(outputPath)), { recursive: true });
await writeFile(resolve(outputPath), JSON.stringify(output, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ output: outputPath, variants: Object.fromEntries(Object.entries(results).map(([id, result]) => [id, { runtimeMs: result.runtimeMs, maeSeconds: result.metrics.maeSeconds }])) }, null, 2));
