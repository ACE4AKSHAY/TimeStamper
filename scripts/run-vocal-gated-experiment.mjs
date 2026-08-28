import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { synchronize } from "../src/engine.js";
import { scoreTimestamps } from "../src/metrics.js";

const inputPath = process.argv[2] || "benchmarks/example.vocal-gated.synthetic.json";
const outputPath = process.argv[3] || "benchmarks/results/vocal-gated-boundary-study.json";
const dataset = JSON.parse(await readFile(resolve(inputPath), "utf8"));
const methods = { energyAdaptiveBoundaryDp: [], vocalGatedBoundaryDp: [] }, references = [];
for (const item of dataset.cases) {
  const lines = item.lyrics.map((originalText, order) => ({ id: `${item.id}-${order}`, originalText, order }));
  const parameters = { profile: item.energy, profiles: { energy: item.energy, voicedness: item.voicedness }, boundaryWeight: 1, minimumIntroFrames: item.energy.length + 1, minLength: 2, maxLength: 12 };
  methods.energyAdaptiveBoundaryDp.push(...synchronize({ lyrics: lines, duration: item.duration, engine: "adaptive-boundary-dp", parameters }).lines.map((line) => line.startTime));
  methods.vocalGatedBoundaryDp.push(...synchronize({ lyrics: lines, duration: item.duration, engine: "vocal-gated-boundary-dp", parameters }).lines.map((line) => line.startTime));
  references.push(...item.reference);
}
const metrics = Object.fromEntries(Object.entries(methods).map(([name, predicted]) => [name, scoreTimestamps(predicted, references)]));
const output = { datasetVersion: dataset.datasetVersion, description: "Comparison of energy-only and voicedness-gated Boundary-DP.", caseCount: dataset.cases.length, methods: Object.fromEntries(Object.entries(methods).map(([name, predicted]) => [name, { predicted, metrics: metrics[name] }])), input: inputPath, generatedAt: new Date().toISOString() };
await mkdir(dirname(resolve(outputPath)), { recursive: true });
await writeFile(resolve(outputPath), JSON.stringify(output, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ output: outputPath, metrics }, null, 2));
