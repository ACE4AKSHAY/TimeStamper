import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { synchronize } from "../src/engine.js";
import { scoreTimestamps } from "../src/metrics.js";
import { buildMfccLineTemplates } from "../src/template-builder.js";
import { extractMfcc } from "../src/features.js";

const outputPath = process.argv[2] || "benchmarks/results/mfcc-parameter-study.json";
const sampleRate = 4000, duration = 2, reference = [0, 0.5, 1, 1.5];
const samples = createSignal(sampleRate, duration, [220, 330, 440, 550]);
const candidates = [];
for (const frameSize of [256, 512, 1024]) for (const hopSize of [128, 256]) for (const melBands of [20, 26, 40]) candidates.push({ frameSize, hopSize, melBands, coefficients: 13 });
const started = performance.now();
const results = candidates.map((parameters) => evaluate(parameters));
results.sort((left, right) => left.metrics.maeSeconds - right.metrics.maeSeconds || left.metrics.rmseSeconds - right.metrics.rmseSeconds);
const output = { datasetVersion: "mfcc-parameter-synthetic-v1", description: "Deterministic MFCC parameter self-alignment sweep; no copyrighted audio.", sampleRate, duration, reference, candidateCount: candidates.length, results, best: results[0], worst: results[results.length - 1], runtimeMs: performance.now() - started, generatedAt: new Date().toISOString() };
await mkdir(dirname(resolve(outputPath)), { recursive: true });
await writeFile(resolve(outputPath), JSON.stringify(output, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ output: outputPath, candidateCount: output.candidateCount, best: output.best, worst: output.worst }, null, 2));

function evaluate(parameters) {
  const templates = buildMfccLineTemplates(samples, sampleRate, reference, duration, parameters);
  const audio = extractMfcc(samples, sampleRate, parameters);
  const lines = reference.map((_, order) => ({ id: `mfcc-${order}`, originalText: `line-${order + 1}`, order }));
  const largestTemplate = templates.templates.reduce((largest, template) => Math.max(largest, template.length), 0);
  const maxLength = Math.max(largestTemplate + 2, Math.ceil(audio.frames.length / lines.length * 2));
  const result = synchronize({ lyrics: lines, engine: "template-mfcc-dtw", parameters: { audioFrames: audio.frames, lineTemplates: templates.templates, frameRate: audio.frameRate, minLength: 1, maxLength, window: 2 } });
  const starts = result.lines.map((line) => line.startTime);
  return { parameters, frameCount: audio.frames.length, templateLengths: templates.templates.map((template) => template.length), metrics: scoreTimestamps(starts, reference), cost: result.alignment.cost, starts };
}

function createSignal(rate, seconds, frequencies) {
  const samples = new Float64Array(Math.floor(rate * seconds));
  frequencies.forEach((frequency, line) => {
    const start = Math.floor(line * samples.length / frequencies.length), end = Math.floor((line + 1) * samples.length / frequencies.length);
    for (let index = start; index < end; index++) {
      const local = (index - start) / Math.max(1, end - start - 1);
      const envelope = Math.min(1, local * 20, (1 - local) * 20);
      samples[index] = 0.65 * envelope * Math.sin(2 * Math.PI * frequency * index / rate);
    }
  });
  return samples;
}
