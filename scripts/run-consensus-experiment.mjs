import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { buildConsensusTimeline } from "../src/consensus-aligner.js";
import { scoreTimestamps } from "../src/metrics.js";

const inputPath = process.argv[2] || "benchmarks/results/generalization-study.json";
const outputPath = process.argv[3] || "benchmarks/results/consensus-study.json";
const dataset = JSON.parse(await readFile(resolve(inputPath), "utf8"));
const started = performance.now();
const candidateNames = ["energyBaseline", "combinedProfile", "boundaryDp", "multiProfileBoundaryDp"];
const consensusPredicted = [], reference = [], cases = [], confidenceBuckets = { high: 0, medium: 0, low: 0 };

for (const item of dataset.cases) {
  const lines = item.reference.map((_, order) => ({ id: `${item.id}-${order}`, originalText: `line-${order + 1}`, order }));
  const candidateTimelines = candidateNames.map((name) => item.predictions[name]);
  const timeline = buildConsensusTimeline(lines, candidateTimelines, { confidenceScale: 1 });
  timeline.forEach((line) => { consensusPredicted.push(line.startTime); reference.push(item.reference[line.order]); confidenceBuckets[line.confidence >= 0.75 ? "high" : line.confidence >= 0.4 ? "medium" : "low"] += 1; });
  cases.push({ id: item.id, predictions: timeline.map((line) => ({ startTime: line.startTime, confidence: line.confidence, spread: line.consensus.spread })) });
}

const output = { datasetVersion: "consensus-synthetic-v1", input: inputPath, candidateEngines: candidateNames, caseCount: cases.length, lineCount: reference.length, metrics: scoreTimestamps(consensusPredicted, reference), confidenceBuckets, cases, runtimeMs: performance.now() - started, generatedAt: new Date().toISOString() };
await mkdir(dirname(resolve(outputPath)), { recursive: true });
await writeFile(resolve(outputPath), JSON.stringify(output, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ output: outputPath, metrics: output.metrics, confidenceBuckets }, null, 2));
