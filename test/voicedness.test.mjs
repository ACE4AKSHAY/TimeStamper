import test from "node:test";
import assert from "node:assert/strict";
import { extractVoicednessProfile } from "../src/audio-profiles.js";

test("extractVoicednessProfile returns finite normalized bins", () => {
  const samples = Float64Array.from({ length: 8192 }, (_, index) => Math.sin(index / 9) * 0.5);
  const profile = extractVoicednessProfile(samples, { frameSize: 256, hopSize: 128, bins: 64 });
  assert.equal(profile.length, 64);
  assert.ok(profile.every((value) => Number.isFinite(value) && value >= 0 && value <= 1));
});

test("extractVoicednessProfile handles silence deterministically", () => {
  const profile = extractVoicednessProfile(new Float64Array(2048), { frameSize: 128, hopSize: 64, bins: 16 });
  assert.deepEqual(profile, Array(16).fill(0));
});
