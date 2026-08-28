import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { decodeWav } from "../src/audio-decoder.mjs";
import { extractExplainableProfiles } from "../src/audio-profiles.js";
import { extractPitchProfile, pitchVoicednessProfile } from "../src/pitch-profile.js";
import { synchronize } from "../src/engine.js";
import { scoreTimestamps } from "../src/metrics.js";

const outputPath = process.argv[2] || "benchmarks/results/offline-pipeline-smoke.json";
const sampleRate = 8000, duration = 4, reference = [0, 1, 2, 3];
const started = performance.now();
const wav = createWav(createSignal(sampleRate, duration, [220, 330, 440, 550]), sampleRate);
const decoded = decodeWav(wav);
const profiles = extractExplainableProfiles(decoded.samples, { frameSize: 256, hopSize: 128, bins: 64 });
const pitch = extractPitchProfile(decoded.samples, decoded.sampleRate, { frameSize: 512, hopSize: 256 });
const lines = reference.map((_, order) => ({ id: `pipeline-${order}`, originalText: `line-${order + 1}`, order }));
const result = synchronize({ lyrics: lines, engine: "multi-profile-boundary-dp", duration: decoded.duration, parameters: { profiles: { ...profiles, voicedness: pitchVoicednessProfile(pitch) }, weights: { energy: 0.5, spectralFlux: 0.3, voicedness: 0.2 } } });
const starts = result.lines.map((line) => line.startTime);
const output = { datasetVersion: "offline-pipeline-synthetic-v1", description: "In-memory WAV decode -> profiles -> pitch -> multi-profile alignment smoke path; no copyrighted audio.", decoder: { format: decoded.format, sampleRate: decoded.sampleRate, samples: decoded.samples.length, duration: decoded.duration }, profiles: { energyFrames: profiles.energy.length, spectralFluxFrames: profiles.spectralFlux.length, voicednessFrames: pitch.frames.length }, engine: result.engine, starts, metrics: scoreTimestamps(starts, reference), runtimeMs: performance.now() - started, generatedAt: new Date().toISOString() };
await mkdir(dirname(resolve(outputPath)), { recursive: true });
await writeFile(resolve(outputPath), JSON.stringify(output, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ output: outputPath, decoder: output.decoder, profiles: output.profiles, engine: output.engine, starts, metrics: output.metrics }, null, 2));

function createSignal(rate, seconds, frequencies) {
  const samples = new Float32Array(Math.floor(rate * seconds));
  frequencies.forEach((frequency, line) => {
    const start = Math.floor(line * samples.length / frequencies.length), end = Math.floor((line + 1) * samples.length / frequencies.length);
    for (let index = start; index < end; index++) samples[index] = 0.6 * Math.sin(2 * Math.PI * frequency * index / rate);
  });
  return samples;
}

function createWav(samples, rate) {
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0); buffer.writeUInt32LE(36 + dataSize, 4); buffer.write("WAVE", 8);
  buffer.write("fmt ", 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(rate, 24); buffer.writeUInt32LE(rate * 2, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36); buffer.writeUInt32LE(dataSize, 40);
  samples.forEach((sample, index) => buffer.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(sample * 32767))), 44 + index * 2));
  return buffer;
}
