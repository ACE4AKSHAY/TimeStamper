import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { createEnergyInitialTimeline } from "../src/energy-aligner.js";
import { scoreTimestamps, formatMetricsMarkdown } from "../src/metrics.js";

const inputPath = process.argv[2] || "benchmarks/example.synthetic.json";
const outputPath = process.argv[3] || "benchmarks/results/energy-baseline.json";
const dataset = JSON.parse(await readFile(resolve(inputPath), "utf8"));
const started = performance.now();
const allPredicted = []; const allReference = []; let peakHeapBytes = 0;
for (const item of dataset.cases) {
  const lines = item.lyrics.map((originalText, order) => ({ id: `${item.id}-${order}`, originalText, order }));
  const result = createEnergyInitialTimeline(lines, item.energy, item.duration);
  allPredicted.push(...result.map((line) => line.startTime)); allReference.push(...item.reference);
  peakHeapBytes = Math.max(peakHeapBytes, process.memoryUsage().heapUsed);
}
const output = { datasetVersion: dataset.datasetVersion, caseCount: dataset.cases.length, metrics: scoreTimestamps(allPredicted, allReference), runtimeMs: performance.now() - started, peakHeapBytes, input: inputPath, generatedAt: new Date().toISOString() };
await mkdir(dirname(resolve(outputPath)), { recursive: true });
await writeFile(resolve(outputPath), JSON.stringify(output, null, 2) + "\n", "utf8");
await writeFile(resolve(outputPath).replace(/\.json$/u, ".md"), formatMetricsMarkdown(output), "utf8");
console.log(`Benchmark complete: ${output.metrics.count} lines, MAE ${output.metrics.maeSeconds.toFixed(3)} s`);
