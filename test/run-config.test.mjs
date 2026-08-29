import test from "node:test";
import assert from "node:assert/strict";
import { createRunConfiguration } from "../src/run-config.mjs";

test("run configuration records effective settings without generated output", () => {
  const config = createRunConfiguration({
    workflow: "local-alignment",
    engine: "multi-profile-boundary-dp",
    decoder: { format: "wav", sampleRate: 44100, duration: 123.4 },
    featureExtraction: { profiles: { bins: 700 }, pitch: { hopSize: 512 } },
    cache: { enabled: true, key: "abc123" },
  });
  assert.equal(config.schemaVersion, 1);
  assert.equal(config.workflow, "local-alignment");
  assert.equal(config.engine, "multi-profile-boundary-dp");
  assert.equal(config.decoder.sampleRate, 44100);
  assert.equal(config.featureExtraction.profiles.bins, 700);
  assert.equal(config.cache.key, "abc123");
  assert.equal("generatedAt" in config, false);
  assert.equal("timestamps" in config, false);
});
