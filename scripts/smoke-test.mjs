import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { decodeWav } from "../src/audio-decoder.mjs";
import { extractExplainableProfiles } from "../src/audio-profiles.js";
import { synchronize } from "../src/engine.js";
import { exportLrc } from "../src/lrc.js";
import { parseLyrics } from "../src/lyrics.js";
import { normalizeResult } from "../src/online-provider.js";

const outputPath = resolve(process.argv[2] || "benchmarks/results/smoke-test.json");
const started = performance.now();
const checks = [];
const check = (name, fn) => {
  try { fn(); checks.push({ name, status: "passed" }); }
  catch (error) { checks.push({ name, status: "failed", error: error.message }); }
};

const lines = parseLyrics("[00:00.00]తెలుగు పంక్తి\n[00:01.00]हिन्दी पंक्ति\n[00:02.00]English line", "smoke.lrc");
check("Unicode LRC parsing", () => {
  if (lines.lines.length !== 3 || !lines.lines[0].originalText.includes("తెలుగు") || !lines.lines[1].originalText.includes("हिन्दी")) throw new Error("Unicode lyric lines were not preserved.");
});

const sampleRate = 8000;
const samples = createSignal(sampleRate, 3, [220, 330, 440]);
const decoded = decodeWav(createWav(samples, sampleRate));
check("PCM WAV decoding", () => {
  if (decoded.format !== "wav" || decoded.samples.length !== samples.length || decoded.sampleRate !== sampleRate) throw new Error("Decoded WAV shape differs from generated PCM.");
});

const profiles = extractExplainableProfiles(decoded.samples, { frameSize: 256, hopSize: 128, bins: 64 });
check("Explainable feature extraction", () => {
  if (!profiles.energy.length || profiles.energy.some((value) => !Number.isFinite(value))) throw new Error("Energy profile is empty or non-finite.");
  if (!profiles.spectralFlux.length) throw new Error("Spectral-flux profile is empty.");
});

const aligned = synchronize({ lyrics: lines.lines, duration: decoded.duration, engine: "multi-profile-boundary-dp", parameters: { profiles, weights: { energy: 0.6, spectralFlux: 0.4 } } });
check("Monotonic synchronization", () => {
  if (aligned.lines.length !== lines.lines.length || aligned.lines.some((line, index) => index > 0 && line.startTime < aligned.lines[index - 1].startTime)) throw new Error("Alignment is not line-count preserving and monotonic.");
});

const output = exportLrc({ metadata: { title: "Smoke test", artist: "", album: "", language: "multi" }, timeline: { lines: aligned.lines } });
check("LRC export", () => {
  if ((output.match(/^\[\d{2}:\d{2}\.\d{2}\]/gmu) || []).length !== aligned.lines.length) throw new Error("LRC export did not contain one timestamped line per input line.");
});

check("Online provider isolation", () => {
  const result = normalizeResult({ trackName: "Song", artistName: "Artist", syncedLyrics: "[00:01.00]line" });
  if (result.title !== "Song" || result.artist !== "Artist" || !result.syncedLyrics) throw new Error("Optional provider normalization failed.");
});

const failed = checks.filter((item) => item.status === "failed");
const report = { schemaVersion: 1, purpose: "local offline product smoke test", networkUsed: false, privateMediaUsed: false, checks, passed: failed.length === 0, runtimeMs: performance.now() - started, generatedAt: new Date().toISOString() };
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, JSON.stringify(report, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ output: outputPath, passed: report.passed, checks: checks.map(({ name, status }) => ({ name, status })), runtimeMs: report.runtimeMs }, null, 2));
if (failed.length) process.exitCode = 1;

function createSignal(rate, seconds, frequencies) {
  const values = new Float32Array(Math.floor(rate * seconds));
  frequencies.forEach((frequency, line) => {
    const start = Math.floor(line * values.length / frequencies.length), end = Math.floor((line + 1) * values.length / frequencies.length);
    for (let index = start; index < end; index++) values[index] = 0.6 * Math.sin(2 * Math.PI * frequency * index / rate);
  });
  return values;
}

function createWav(values, rate) {
  const dataSize = values.length * 2, buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0); buffer.writeUInt32LE(36 + dataSize, 4); buffer.write("WAVE", 8); buffer.write("fmt ", 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(rate, 24); buffer.writeUInt32LE(rate * 2, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write("data", 36); buffer.writeUInt32LE(dataSize, 40);
  values.forEach((value, index) => buffer.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(value * 32767))), 44 + index * 2));
  return buffer;
}
