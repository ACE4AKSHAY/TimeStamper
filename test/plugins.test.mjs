import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { alignCtcEmissions } from "../src/plugins/ctc-viterbi.js";
import { discoverPlugins, verifyManifest } from "../src/plugins/discovery.js";
import { describePlugin, validatePlugin } from "../src/plugins/contract.js";

test("CTC Viterbi aligns tokens on deterministic synthetic emissions", () => {
  const emissions = [
    [0.9, 0.1, 0.01],
    [0.1, 0.9, 0.01],
    [0.9, 0.1, 0.01],
    [0.1, 0.01, 0.9],
    [0.9, 0.01, 0.1],
  ];
  const result = alignCtcEmissions(emissions, [1, 2], { blankIndex: 0 });
  assert.deepEqual(
    result.spans.map((span) => span.token),
    [1, 2],
  );
  assert.ok(result.spans[0].startFrame <= result.spans[0].endFrame);
  assert.ok(result.spans[0].endFrame < result.spans[1].startFrame);
  assert.equal(result.method, "ctc_viterbi");
});

test("plugin contracts validate metadata without requiring a model", () => {
  const plugin = {
    id: "fake-aligner",
    kind: "forced-aligner",
    version: "1",
    license: "MIT",
    requires: [],
    init() {},
    run() {},
    dispose() {},
  };
  assert.equal(validatePlugin(plugin), plugin);
  assert.deepEqual(describePlugin(plugin), { id: "fake-aligner", kind: "forced-aligner", version: "1", requires: [] });
  assert.throws(() => validatePlugin({ id: "bad", kind: "model", version: "1", license: "x", requires: [] }), /kind/u);
});

test("empty model directories stay optional and manifest hashes are verifiable", async () => {
  const root = await mkdtemp(join(tmpdir(), "lyricsync-models-"));
  assert.deepEqual(await discoverPlugins(root), []);
  await writeFile(join(root, "weights.bin"), "model-data");
  const manifest = { files: [{ path: "weights.bin", sha256: "bad" }] };
  const verification = await verifyManifest(manifest, root);
  assert.equal(verification.valid, false);
  assert.equal(verification.mismatches[0].reason, "sha256 mismatch");
});
