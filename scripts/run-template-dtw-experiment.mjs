import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { synchronize } from "../src/engine.js";
import { scoreTimestamps } from "../src/metrics.js";

const inputPath = process.argv[2] || "benchmarks/example.template.synthetic.json";
const outputPath = process.argv[3] || "benchmarks/results/template-mfcc-dtw.json";
const dataset = JSON.parse(await readFile(resolve(inputPath), "utf8"));
const cases = [], predicted = [], reference = [];
const started = performance.now();
for (const item of dataset.cases) {
  const lines = item.lyrics.map((originalText, order) => ({ id: `${item.id}-${order}`, originalText, order }));
  const result = synchronize({ lyrics: lines, engine: "template-mfcc-dtw", parameters: { audioFrames: item.audioFrames, lineTemplates: item.lineTemplates, frameRate: item.frameRate, minLength: item.lineTemplates[0].length, maxLength: item.lineTemplates[0].length + 1, window: 2 } });
  const starts = result.lines.map((line) => line.startTime);
  predicted.push(...starts); reference.push(...item.reference);
  cases.push({ id: item.id, frameRate: item.frameRate, cost: result.alignment.cost, starts });
}
const output = { datasetVersion: dataset.datasetVersion, caseCount: dataset.cases.length, method: "template_mfcc_dtw", runtimeMs: performance.now() - started, metrics: scoreTimestamps(predicted, reference), cases, input: inputPath, generatedAt: new Date().toISOString() };
await mkdir(dirname(resolve(outputPath)), { recursive: true });
await writeFile(resolve(outputPath), JSON.stringify(output, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ output: outputPath, method: output.method, metrics: output.metrics }, null, 2));
