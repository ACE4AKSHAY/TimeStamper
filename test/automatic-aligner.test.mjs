import test from "node:test";
import assert from "node:assert/strict";
import { alignAutomatically, selectAutomaticRoute } from "../src/automatic-aligner.js";
import { synchronize } from "../src/engine.js";

const lines = [{ id: "one", originalText: "one", order: 0 }, { id: "two", originalText: "two", order: 1 }];

test("automatic route selects vocal gating when voiced coverage is sufficient", () => {
  const route = selectAutomaticRoute({ energy: [0.1, 0.8, 0.2], voicedness: [0.8, 0.9, 0.7], spectralFlux: [0.2, 0.4, 0.3] });
  assert.equal(route.engine, "adaptive-vocal-boundary-dp");
});

test("automatic route falls back transparently when only energy is available", () => {
  const route = selectAutomaticRoute({ energy: [0.1, 0.8, 0.2] });
  assert.equal(route.engine, "adaptive-boundary-dp");
  assert.equal(route.reason, "energy_fallback");
});

test("automatic engine is exposed through the platform-neutral API", () => {
  const result = synchronize({ lyrics: lines, engine: "automatic", duration: 10, parameters: { profiles: { energy: [0.1, 0.8, 0.2], spectralFlux: [0.2, 0.4, 0.3] } } });
  assert.equal(result.engine, "automatic");
  assert.equal(result.selectedEngine, "combined-profile");
  assert.equal(result.lines.length, lines.length);
});

test("automatic alignment preserves monotonic output", () => {
  const result = alignAutomatically(lines, { energy: [0.1, 0.8, 0.2], voicedness: [0.1, 0.1, 0.1] }, 10);
  assert.ok(result.lines[1].startTime >= result.lines[0].startTime);
});
