import test from "node:test";
import assert from "node:assert/strict";
import { retimeLrc } from "../src/retime-lrc.js";

function profileFor(times, duration, bins = 1200, drift = 1, offset = 0) {
  const energy = Array(bins).fill(0.02);
  const voicedness = Array(bins).fill(0.02);
  const spectralFlux = Array(bins).fill(0.01);
  times.forEach((time) => {
    const index = Math.round(((drift * time + offset) / duration) * (bins - 1));
    for (let delta = -2; delta <= 2; delta++) {
      const target = index + delta;
      if (target >= 0 && target < bins) {
        energy[target] = Math.max(energy[target], 1 - Math.abs(delta) * 0.1);
        voicedness[target] = 1;
        spectralFlux[target] = 1 - Math.abs(delta) * 0.1;
      }
    }
  });
  return { energy, voicedness, spectralFlux };
}

const lines = [5, 12, 20, 29, 38].map((startTime, index) => ({
  id: `line-${index}`,
  text: `line ${index}`,
  startTime,
}));

test("retimeLrc recovers a pure recording shift", () => {
  const result = retimeLrc({
    lines,
    duration: 60,
    profiles: profileFor(
      lines.map((line) => line.startTime),
      60,
      1200,
      1,
      1.7,
    ),
  });
  assert.equal(result.diagnostics.refused, false);
  assert.ok(Math.abs(result.diagnostics.globalOffset - 1.7) < 0.08);
  assert.ok(Math.abs(result.lines[0].startTime - 6.7) < 0.08);
  assert.ok(result.lines.every((line, index) => index === 0 || line.startTime >= result.lines[index - 1].startTime));
});

test("retimeLrc estimates bounded drift after a small shift", () => {
  const result = retimeLrc({
    lines,
    duration: 60,
    profiles: profileFor(
      lines.map((line) => line.startTime),
      60,
      4800,
      1.002,
      0.8,
    ),
  });
  assert.equal(result.diagnostics.refused, false);
  assert.ok(Math.abs(result.diagnostics.driftScale - 1.002) < 0.0005);
  assert.ok(result.diagnostics.inlierRatio >= 0.8);
});

test("retimeLrc refuses flat and instrumental-like profiles", () => {
  const flat = retimeLrc({
    lines,
    duration: 60,
    profiles: { energy: Array(300).fill(0.2), voicedness: Array(300).fill(0.1) },
  });
  assert.equal(flat.reviewRequired, true);
  assert.equal(flat.confidence, 0);
  assert.match(flat.diagnostics.reason, /flat/u);

  const instrumental = retimeLrc({
    lines,
    duration: 60,
    profiles: {
      energy: profileFor(
        lines.map((line) => line.startTime),
        60,
      ).energy,
      voicedness: Array(1200).fill(0.01),
    },
  });
  assert.equal(instrumental.reviewRequired, true);
  assert.match(instrumental.diagnostics.reason, /instrumental|voicedness/u);
  assert.ok(instrumental.lines.every((line) => line.startTime === null));
});
