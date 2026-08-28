import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { synchronize } from "../src/engine.js";

const inputPath = process.argv[2] || "benchmarks/example.multi-profile.synthetic.json";
const outputPath = process.argv[3] || "benchmarks/results/performance-benchmark.json";
const iterations = Number.isInteger(Number(process.argv[4])) ? Math.max(10, Number(process.argv[4])) : 200;
const dataset = JSON.parse(await readFile(resolve(inputPath), "utf8"));
const methods = ["energyBaseline", "combinedProfile", "boundaryDp", "multiProfileBoundaryDp", "introAwareBoundaryDp", "adaptiveBoundaryDp"];
const started = performance.now();
const benchmark = {};

for (const method of methods) benchmark[method] = measure(method);

const output = {
  datasetVersion: "performance-synthetic-v1",
  input: inputPath,
  caseCount: dataset.cases.length,
  iterations,
  methods,
  benchmark,
  totalRuntimeMs: performance.now() - started,
  node: process.version,
  generatedAt: new Date().toISOString(),
};
await mkdir(dirname(resolve(outputPath)), { recursive: true });
await writeFile(resolve(outputPath), JSON.stringify(output, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ output: outputPath, iterations, benchmark }, null, 2));

function measure(method) {
  const runner = () => {
    for (const item of dataset.cases) {
      const lines = item.lyrics.map((originalText, order) => ({ id: `${item.id}-${order}`, originalText, order }));
      const profiles = item.profiles || { energy: item.energy || [], spectralFlux: item.spectralFlux || item.energy || [], voicedness: item.voicedness || item.energy || [] };
      const common = { lyrics: lines, duration: item.duration, energyProfile: profiles.energy };
      if (method === "energyBaseline") synchronize(common);
      else if (method === "combinedProfile") synchronize({ ...common, engine: "combined-profile", parameters: { profiles, weights: { energy: 0.65, spectralFlux: 0.35 } } });
      else if (method === "boundaryDp") synchronize({ ...common, engine: "boundary-dp", parameters: { profile: profiles.energy } });
      else if (method === "multiProfileBoundaryDp") synchronize({ ...common, engine: "multi-profile-boundary-dp", parameters: { profiles, weights: { energy: 0.5, spectralFlux: 0.3, voicedness: 0.2 } } });
      else if (method === "introAwareBoundaryDp") synchronize({ ...common, engine: "intro-aware-boundary-dp", parameters: { profile: profiles.energy } });
      else synchronize({ ...common, engine: "adaptive-boundary-dp", parameters: { profile: profiles.energy, minimumIntroFrames: 3 } });
    }
  };
  for (let warmup = 0; warmup < 10; warmup++) runner();
  const samples = [];
  let peakHeapBytes = 0;
  for (let index = 0; index < iterations; index++) {
    const before = performance.now();
    runner();
    samples.push(performance.now() - before);
    peakHeapBytes = Math.max(peakHeapBytes, process.memoryUsage().heapUsed);
  }
  samples.sort((a, b) => a - b);
  return {
    iterations,
    medianMs: percentile(samples, 0.5),
    p95Ms: percentile(samples, 0.95),
    minMs: samples[0],
    maxMs: samples[samples.length - 1],
    peakHeapBytes,
    averageMsPerCase: percentile(samples, 0.5) / dataset.cases.length,
  };
}

function percentile(values, fraction) {
  const position = (values.length - 1) * fraction;
  const lower = Math.floor(position), upper = Math.ceil(position);
  return values[lower] + (values[upper] - values[lower]) * (position - lower);
}
