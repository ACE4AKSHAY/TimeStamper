import test from "node:test";
import assert from "node:assert/strict";
import { decodeWav, AudioDecoderError } from "../src/audio-decoder.mjs";

function wav16(samples, sampleRate = 8000, channels = 1) {
  const data = Buffer.alloc(samples.length * 2), fmtSize = 16, riffSize = 4 + 8 + fmtSize + 8 + data.length, output = Buffer.alloc(8 + riffSize);
  output.write("RIFF", 0); output.writeUInt32LE(riffSize, 4); output.write("WAVE", 8); output.write("fmt ", 12); output.writeUInt32LE(fmtSize, 16); output.writeUInt16LE(1, 20); output.writeUInt16LE(channels, 22); output.writeUInt32LE(sampleRate, 24); output.writeUInt32LE(sampleRate * channels * 2, 28); output.writeUInt16LE(channels * 2, 32); output.writeUInt16LE(16, 34); output.write("data", 36); output.writeUInt32LE(data.length, 40);
  samples.forEach((value, index) => data.writeInt16LE(value, index * 2)); data.copy(output, 44); return output;
}

test("decodes PCM WAV to normalized mono samples", () => {
  const decoded = decodeWav(wav16([-32768, 0, 32767], 8000));
  assert.equal(decoded.sampleRate, 8000); assert.equal(decoded.duration, 3 / 8000); assert.equal(decoded.channels, 1); assert.ok(decoded.samples[0] <= -0.999); assert.equal(decoded.samples[1], 0); assert.ok(decoded.samples[2] > 0.99);
});

test("rejects unsupported containers with an actionable error", () => {
  assert.throws(() => decodeWav(Buffer.from("not audio")), (error) => error instanceof AudioDecoderError && error.code === "INVALID_WAV");
});
