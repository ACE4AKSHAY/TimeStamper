import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { synchronize } from "../src/engine.js";
import { scoreTimestamps } from "../src/metrics.js";

const inputPath = process.argv[2] || "benchmarks/example.adaptive-vocal.synthetic.json";
const outputPath = process.argv[3] || "benchmarks/results/adaptive-vocal-sweep.json";
const dataset = JSON.parse(await readFile(resolve(inputPath), "utf8"));
const coverageValues = [0.1, 0.2, 0.4, 0.6];
const thresholdValues = [0.3, 0.5, 0.7];
const results = [];
for (const minimumVoicedCoverage of coverageValues) {
  for (const voicedThreshold of thresholdValues) {
    const predicted = [], references = [], selections = [];
    for (const item of dataset.cases) {
      const lines = item.lyrics.map((originalText, order) => ({ id: `${item.id}-${order}`, originalText, order }));
      const result = synchronize({ lyrics: lines, duration: item.duration, engine: "adaptive-vocal-boundary-dp", parameters: { profiles: { energy: item.energy, voicedness: item.voicedness }, minimumVoicedCoverage, voicedThreshold, minimumIntroFrames: item.energy.length + 1, minLength: 2, maxLength: 12 } });
      predicted.push(...result.lines.map((line) => line.startTime));
      references.push(...item.reference);
      selections.push({ id: item.id, reason: result.alignment.selection.reason, voicedCoverage: result.alignment.selection.voicedCoverage });
    }
    results.push({ parameters: { minimumVoicedCoverage, voicedThreshold }, metrics: scoreTimestamps(predicted, references), selections });
  }
}
results.sort((a, b) => a.metrics.maeSeconds - b.metrics.maeSeconds || a.parameters.minimumVoicedCoverage - b.parameters.minimumVoicedCoverage || a.parameters.voicedThreshold - b.parameters.voicedThreshold);
const output = { datasetVersion: "adaptive-vocal-threshold-sweep-v1", input: inputPath, coverageValues, thresholdValues, candidateCount: results.length, best: results[0], worst: results.at(-1), results, generatedAt: new Date().toISOString() };
await mkdir(dirname(resolve(outputPath)), { recursive: true });
await writeFile(resolve(outputPath), JSON.stringify(output, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ output: outputPath, candidateCount: output.candidateCount, best: output.best, worst: output.worst }, null, 2));
