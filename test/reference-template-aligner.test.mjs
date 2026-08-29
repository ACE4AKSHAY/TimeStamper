import test from "node:test";
import assert from "node:assert/strict";
import { alignWithReferenceTemplates } from "../src/reference-template-aligner.js";

test("reference-template adapter aligns a target recording and preserves line metadata", () => {
  const sampleRate = 8000;
  const samples = Float32Array.from({ length: 3200 }, (_, index) => {
    const frequency = index < 1600 ? 220 : 440;
    const local = index % 1600;
    const envelope = Math.min(1, local / 120, (1600 - local) / 120);
    return 0.6 * envelope * Math.sin(2 * Math.PI * frequency * index / sampleRate);
  });
  const lines = [{ id: "a", originalText: "one", order: 0 }, { id: "b", originalText: "two", order: 1 }];
  const result = alignWithReferenceTemplates({
    referenceSamples: samples,
    referenceSampleRate: sampleRate,
    referenceStarts: [0, 0.2],
    referenceDuration: 0.4,
    targetSamples: samples,
    targetSampleRate: sampleRate,
    targetDuration: 0.4,
    lyrics: lines,
    options: { mfcc: { frameSize: 128, hopSize: 64, melBands: 12, coefficients: 6 }, maxLength: 40, window: 4 },
  });
  assert.equal(result.method, "reference_template_mfcc_dtw");
  assert.equal(result.lines.length, 2);
  assert.equal(result.lines[0].alignmentMethod, "reference_template_mfcc_dtw");
  assert.equal(result.lines[0].startTime, 0);
  assert.ok(result.lines[1].startTime >= result.lines[0].startTime);
  assert.ok(Number.isFinite(result.alignment.cost));
  assert.ok(result.lines.every((line) => Number.isFinite(line.confidence) && line.confidence >= 0 && line.confidence <= 1));
  assert.equal(result.alignment.diagnostics.reviewThreshold, 0.5);
  assert.equal(result.reference.lineCount, 2);
});

test("reference-template adapter rejects a lyric/reference line mismatch", () => {
  assert.throws(() => alignWithReferenceTemplates({
    referenceSamples: [0, 1], referenceSampleRate: 10, referenceStarts: [0], referenceDuration: 0.2,
    targetSamples: [0, 1], targetSampleRate: 10, targetDuration: 0.2,
    lyrics: [{ originalText: "one", order: 0 }, { originalText: "two", order: 1 }],
  }), /line count must match/u);
});
