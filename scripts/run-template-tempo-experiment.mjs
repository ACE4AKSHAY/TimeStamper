import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { synchronize } from "../src/engine.js";
import { scoreTimestamps } from "../src/metrics.js";

const inputPath = process.argv[2] || "benchmarks/example.template.synthetic.json";
const outputPath = process.argv[3] || "benchmarks/results/template-tempo-study.json";
const fixture = JSON.parse(await readFile(resolve(inputPath), "utf8"));
const started = performance.now();
const variants = [];
for (const source of fixture.cases) {
  for (const tempoScale of [0.75, 1, 1.25]) variants.push(makeVariant(source, tempoScale));
}
const windows = [0, 1, 2];
const results = {};
for (const window of windows) results[`window-${window}`] = evaluate(window);

const output = { datasetVersion: "template-tempo-synthetic-v1", input: inputPath, description: "Deterministic template-DTW time-stretch study; no copyrighted audio.", variantCount: variants.length, tempoScales: [0.75, 1, 1.25], windows, results, runtimeMs: performance.now() - started, generatedAt: new Date().toISOString() };
await mkdir(dirname(resolve(outputPath)), { recursive: true });
await writeFile(resolve(outputPath), JSON.stringify(output, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ output: outputPath, results: Object.fromEntries(Object.entries(results).map(([name, value]) => [name, value.metrics])) }, null, 2));

function evaluate(window) {
  const predicted = [], reference = [], cases = [];
  for (const item of variants) {
    const lines = item.lyrics.map((originalText, order) => ({ id: `${item.id}-${order}`, originalText, order }));
    const result = synchronize({ lyrics: lines, engine: "template-mfcc-dtw", parameters: { audioFrames: item.audioFrames, lineTemplates: item.lineTemplates, frameRate: item.frameRate, minLength: 1, maxLength: item.audioFrames.length, window } });
    const starts = result.lines.map((line) => line.startTime);
    predicted.push(...starts); reference.push(...item.reference);
    cases.push({ id: item.id, tempoScale: item.tempoScale, predicted: starts, reference: item.reference, cost: result.alignment.cost });
  }
  return { metrics: scoreTimestamps(predicted, reference), cases };
}

function makeVariant(source, tempoScale) {
  const targetLines = source.lineTemplates.map((template) => resample(template, Math.max(1, Math.round(template.length * tempoScale))));
  const audioFrames = targetLines.flatMap((line, index) => index === targetLines.length - 1 ? line : [...line, midpoint(line[line.length - 1], targetLines[index + 1][0])]);
  const starts = [];
  let cursor = 0;
  for (const line of targetLines) { starts.push(cursor / source.frameRate); cursor += line.length + 1; }
  return { id: `${source.id}-tempo-${String(tempoScale).replace(".", "")}`, tempoScale, frameRate: source.frameRate, lyrics: source.lyrics, lineTemplates: source.lineTemplates, audioFrames, reference: starts };
}

function resample(sequence, length) {
  if (sequence.length === length) return sequence.map((frame) => [...frame]);
  return Array.from({ length }, (_, index) => {
    const position = index * (sequence.length - 1) / Math.max(1, length - 1);
    const left = Math.floor(position), right = Math.min(sequence.length - 1, left + 1), fraction = position - left;
    return sequence[left].map((value, dimension) => value * (1 - fraction) + sequence[right][dimension] * fraction);
  });
}

function midpoint(left, right) { return left.map((value, index) => (value + right[index]) / 2); }
