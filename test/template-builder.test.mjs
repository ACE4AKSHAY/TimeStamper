import test from "node:test";
import assert from "node:assert/strict";
import { buildMfccLineTemplates } from "../src/template-builder.js";

test("builds one finite MFCC template per verified reference line", () => {
  const sampleRate = 8000, samples = Float32Array.from({ length: 1600 }, (_, index) => Math.sin(2 * Math.PI * 220 * index / sampleRate));
  const result = buildMfccLineTemplates(samples, sampleRate, [0, 0.1], 0.2, { frameSize: 128, hopSize: 64, melBands: 12, coefficients: 6 });
  assert.equal(result.templates.length, 2);
  assert.equal(result.frameRate, 125);
  assert.ok(result.templates.every((template) => template.length > 0 && template.every((frame) => frame.every(Number.isFinite))));
});

test("rejects reference starts that move backward", () => {
  assert.throws(() => buildMfccLineTemplates(new Float32Array(100), 8000, [0.1, 0.05], 0.2), /monotonic/u);
});
