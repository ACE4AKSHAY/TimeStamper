import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { synchronize } from "../src/engine.js";
import { scoreTimestamps } from "../src/metrics.js";

const inputPath = process.argv[2] || "benchmarks/example.template.synthetic.json";
const outputPath = process.argv[3] || "benchmarks/results/template-noise-study.json";
const fixture = JSON.parse(await readFile(resolve(inputPath), "utf8"));
const started = performance.now();
const variants = [];
for (const source of fixture.cases) {
  for (const noiseAmplitude of [0, 0.05, 0.15, 0.3]) {
    for (const dropRate of [0, 0.1]) variants.push(makeVariant(source, noiseAmplitude, dropRate));
  }
}
const windows = [0, 1, 2, 3];
const results = Object.fromEntries(windows.map((window) => [`window-${window}`, evaluate(window)]));
const output = { datasetVersion: "template-noise-synthetic-v1", input: inputPath, description: "Deterministic MFCC-template feature-noise and frame-drop study; no copyrighted audio.", variantCount: variants.length, noiseAmplitudes: [0, 0.05, 0.15, 0.3], dropRates: [0, 0.1], windows, results, runtimeMs: performance.now() - started, generatedAt: new Date().toISOString() };
await mkdir(dirname(resolve(outputPath)), { recursive: true });
await writeFile(resolve(outputPath), JSON.stringify(output, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ output: outputPath, metrics: Object.fromEntries(Object.entries(results).map(([name, result]) => [name, result.metrics])) }, null, 2));

function evaluate(window) {
  const predicted = [], reference = [], cases = [];
  for (const item of variants) {
    const lines = item.lyrics.map((originalText, order) => ({ id: `${item.id}-${order}`, originalText, order }));
    const result = synchronize({ lyrics: lines, engine: "template-mfcc-dtw", parameters: { audioFrames: item.audioFrames, lineTemplates: item.lineTemplates, frameRate: item.frameRate, minLength: 1, maxLength: item.audioFrames.length, window } });
    const starts = result.lines.map((line) => line.startTime);
    predicted.push(...starts); reference.push(...item.reference);
    cases.push({ id: item.id, noiseAmplitude: item.noiseAmplitude, dropRate: item.dropRate, predicted: starts, reference: item.reference, cost: result.alignment.cost });
  }
  return { metrics: scoreTimestamps(predicted, reference), cases };
}

function makeVariant(source, noiseAmplitude, dropRate) {
  const targetLines = source.lineTemplates.map((template, lineIndex) => template.map((frame, frameIndex) => frame.map((value, dimension) => value + deterministicNoise(lineIndex, frameIndex, dimension) * noiseAmplitude)).filter((_, frameIndex) => dropRate === 0 || (frameIndex + lineIndex) % Math.max(2, Math.round(1 / dropRate)) !== 0));
  const audioFrames = targetLines.flatMap((line, index) => index === targetLines.length - 1 ? line : [...line, midpoint(line[line.length - 1], targetLines[index + 1][0])]);
  const reference = [];
  let cursor = 0;
  for (const line of targetLines) { reference.push(cursor / source.frameRate); cursor += line.length + 1; }
  return { id: `${source.id}-noise-${String(noiseAmplitude).replace(".", "")}-drop-${String(dropRate).replace(".", "")}`, noiseAmplitude, dropRate, frameRate: source.frameRate, lyrics: source.lyrics, lineTemplates: source.lineTemplates, audioFrames, reference };
}

function deterministicNoise(line, frame, dimension) {
  return (((line + 1) * 17 + (frame + 1) * 11 + (dimension + 1) * 7) % 19) / 9.5 - 1;
}

function midpoint(left, right) { return left.map((value, index) => (value + right[index]) / 2); }
