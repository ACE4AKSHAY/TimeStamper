import test from "node:test";
import assert from "node:assert/strict";
import { decodeWav } from "../src/audio-decoder.mjs";
import { extractExplainableProfiles } from "../src/audio-profiles.js";
import { exportLrc } from "../src/lrc.js";
import { parseLyrics } from "../src/lyrics.js";
import { synchronize } from "../src/engine.js";

test("audio-to-lyrics-to-timeline-to-LRC pipeline preserves Unicode", () => {
  const sampleRate = 8000;
  const samples = Float32Array.from({ length: sampleRate }, (_, index) => 0.5 * Math.sin(2 * Math.PI * (index < sampleRate / 2 ? 220 : 440) * index / sampleRate));
  const wav = makePcm16Wav(samples, sampleRate);
  const decoded = decodeWav(wav);
  const parsed = parseLyrics("[00:00.00]తెలుగు పంక్తి\n[00:00.50]हिन्दी पंक्ति", "integration.lrc");
  const profiles = extractExplainableProfiles(decoded.samples, { bins: 40 });
  const aligned = synchronize({ lyrics: parsed.lines, duration: decoded.duration, energyProfile: profiles.energy, engine: "energy-baseline" });
  const project = { metadata: { title: "Integration", artist: "", album: "", language: "multi" }, timeline: { lines: aligned.lines } };
  const output = exportLrc(project);
  assert.equal(decoded.format, "wav");
  assert.equal(decoded.samples.length, samples.length);
  assert.equal(aligned.lines.length, 2);
  assert.match(output, /తెలుగు/u);
  assert.match(output, /हिन्दी/u);
  assert.equal(output.split("\n").filter((line) => /^\[\d{2}:\d{2}\.\d{2}\]/u.test(line)).length, 2);
});

function makePcm16Wav(samples, sampleRate) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((sample, index) => data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(sample * 32767))), index * 2));
  const header = Buffer.alloc(44);
  header.write("RIFF", 0); header.writeUInt32LE(36 + data.length, 4); header.write("WAVE", 8);
  header.write("fmt ", 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24); header.writeUInt32LE(sampleRate * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
  header.write("data", 36); header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}
