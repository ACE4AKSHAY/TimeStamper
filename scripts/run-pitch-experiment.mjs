import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { extractPitchProfile } from "../src/pitch-profile.js";

const inputPath = process.argv[2] || "benchmarks/example.pitch.synthetic.json";
const outputPath = process.argv[3] || "benchmarks/results/pitch-profile.json";
const dataset = JSON.parse(await readFile(resolve(inputPath), "utf8"));
const errors = [], segmentResults = [], started = performance.now();
let silenceFrames = 0, falseVoicedSilenceFrames = 0;
for (const segment of dataset.segments) {
  const sampleCount = Math.round(dataset.sampleRate * segment.durationSeconds);
  const samples = Array.from({ length: sampleCount }, (_, index) => segment.frequencyHz ? 0.8 * Math.sin(2 * Math.PI * segment.frequencyHz * index / dataset.sampleRate) : 0);
  const pitch = extractPitchProfile(samples, dataset.sampleRate, { frameSize: dataset.frameSize, hopSize: dataset.hopSize, minFrequency: 80, maxFrequency: 500 });
  const voiced = pitch.frames.filter((frame) => frame.voiced);
  if (segment.frequencyHz) errors.push(...voiced.map((frame) => Math.abs(frame.frequencyHz - segment.frequencyHz)));
  else { silenceFrames += pitch.frames.length; falseVoicedSilenceFrames += voiced.length; }
  segmentResults.push({ id: segment.id, expectedFrequencyHz: segment.frequencyHz || null, frameCount: pitch.frames.length, voicedFrames: voiced.length, medianFrequencyHz: voiced.length ? voiced.map((frame) => frame.frequencyHz).sort((a, b) => a - b)[Math.floor(voiced.length / 2)] : null });
}
const sortedErrors = [...errors].sort((a, b) => a - b);
const metrics = { voicedFrequencyMaeHz: errors.reduce((sum, value) => sum + value, 0) / Math.max(1, errors.length), voicedFrequencyMedianAbsoluteErrorHz: sortedErrors.length ? sortedErrors[Math.floor(sortedErrors.length / 2)] : 0, voicedFrames: errors.length, silenceFalseVoicedRate: falseVoicedSilenceFrames / Math.max(1, silenceFrames) };
const output = { datasetVersion: dataset.datasetVersion, method: "autocorrelation_pitch_profile", runtimeMs: performance.now() - started, metrics, segments: segmentResults, input: inputPath, generatedAt: new Date().toISOString() };
await mkdir(dirname(resolve(outputPath)), { recursive: true });
await writeFile(resolve(outputPath), JSON.stringify(output, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ output: outputPath, method: output.method, metrics }, null, 2));
