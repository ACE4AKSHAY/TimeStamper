import test from "node:test";
import assert from "node:assert/strict";
import { ENGINE_REGISTRY, listEngines, synchronize } from "../src/engine.js";

const lines = [
  { id: "one", originalText: "one", order: 0 },
  { id: "two", originalText: "two", order: 1 },
];

test("engine registry describes every public engine", () => {
  const descriptions = listEngines();
  assert.ok(descriptions.length >= 16);
  assert.equal(new Set(descriptions.map((item) => item.name)).size, descriptions.length);
  assert.ok(descriptions.every((item) => ["recommended", "experimental"].includes(item.maturity)));
  assert.ok(descriptions.every((item) => Array.isArray(item.requires) && item.cost));
  assert.equal(ENGINE_REGISTRY.automatic.describe().name, "automatic");
});

test("registry dispatch preserves deterministic monotonic output", () => {
  const request = {
    lyrics: lines,
    duration: 10,
    engine: "automatic",
    parameters: { profiles: { energy: [0.1, 0.8, 0.2], spectralFlux: [0.2, 0.4, 0.3] } },
  };
  const first = synchronize(request);
  const second = synchronize(request);
  assert.deepEqual(
    first.lines.map((line) => line.startTime),
    second.lines.map((line) => line.startTime),
  );
  assert.ok(first.lines.every((line, index) => index === 0 || line.startTime >= first.lines[index - 1].startTime));
});

test("registry adapters keep explicit engine selection stable", () => {
  const result = ENGINE_REGISTRY["boundary-dp"].run({
    lyrics: lines,
    duration: 10,
    parameters: { profile: [0.1, 0.8, 0.2, 0.7], minLength: 1, maxLength: 4 },
  });
  assert.equal(result.engine, "boundary-dp");
  assert.ok(result.lines.every((line) => Number.isFinite(line.startTime)));
});
