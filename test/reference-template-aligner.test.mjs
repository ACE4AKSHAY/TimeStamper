import test from "node:test";
import assert from "node:assert/strict";
import { alignWithReferenceTemplates, alignWithSeparatedReferenceTarget } from "../src/reference-template-aligner.js";
import { synchronize } from "../src/engine.js";
import { createPassthroughSeparator, createVocalSeparator, validateSeparatedAudio } from "../src/vocal-separator.js";
import { extractMfcc } from "../src/features.js";

test("vocal separator contract validates PCM and preserves a deterministic passthrough", async () => {
  const input = { samples: [0, 0.25, -0.25], sampleRate: 8000 };
  const separated = await createPassthroughSeparator().separate(input);
  assert.ok(separated.samples instanceof Float32Array);
  assert.equal(separated.duration, 3 / 8000);
  const custom = createVocalSeparator({ name: "test-separator", separate: async () => ({ samples: [1], sampleRate: 4000 }) });
  assert.equal((await custom.separate(input)).format, "separated-pcm");
  assert.throws(() => validateSeparatedAudio({ samples: [], sampleRate: 8000 }), /empty audio/u);
});

test("reference-template adapter aligns a target recording and preserves line metadata", async () => {
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
  assert.ok(result.lines.every((line) => ["stable", "high_relative_cost", "unstable_boundary", "high_relative_cost_and_unstable_boundary"].includes(line.failureCategory)));
  assert.equal(result.alignment.diagnostics.reviewThreshold, 0.5);
  assert.equal(result.reference.lineCount, 2);
  const banded = alignWithReferenceTemplates({
    referenceSamples: samples,
    referenceSampleRate: sampleRate,
    referenceStarts: [0, 0.2],
    referenceDuration: 0.4,
    targetSamples: samples,
    targetSampleRate: sampleRate,
    targetDuration: 0.4,
    lyrics: lines,
    options: { mfcc: { frameSize: 128, hopSize: 64, melBands: 12, coefficients: 6 }, maxLength: 40, window: 4, dtwImplementation: "banded" },
  });
  assert.deepEqual(banded.lines.map((line) => line.startTime), result.lines.map((line) => line.startTime));
  assert.equal(banded.parameters.dtwImplementation, "banded");
  const anchorFree = alignWithReferenceTemplates({
    referenceSamples: samples,
    referenceSampleRate: sampleRate,
    referenceStarts: [0, 0.2],
    referenceDuration: 0.4,
    targetSamples: samples,
    targetSampleRate: sampleRate,
    targetDuration: 0.4,
    lyrics: lines,
    options: { mfcc: { frameSize: 128, hopSize: 64, melBands: 12, coefficients: 6 }, maxLength: 40, window: 4, useReferenceAnchors: false, searchStride: 2 },
  });
  assert.equal(anchorFree.parameters.useReferenceAnchors, false);
  assert.equal(anchorFree.parameters.expectedStarts, null);
  assert.ok(anchorFree.lines.every((line) => Number.isFinite(line.startTime)));
  const scaled = await alignWithReferenceTemplates({
    referenceSamples: samples,
    referenceSampleRate: sampleRate,
    referenceStarts: [0, 0.2],
    referenceDuration: 0.4,
    targetSamples: Float32Array.from({ length: 4800 }, (_, index) => samples[index % samples.length]),
    targetSampleRate: sampleRate,
    targetDuration: 0.6,
    lyrics: lines,
    options: { mfcc: { frameSize: 128, hopSize: 64, melBands: 12, coefficients: 6 }, maxLength: 80, window: 4, anchorScale: "duration-ratio" },
  });
  assert.ok(Math.abs(scaled.parameters.anchorScale - 1.5) < 1e-12);
  assert.equal(scaled.parameters.expectedStarts[1], 38);

  const throughEngine = synchronize({
    lyrics: lines,
    duration: 0.4,
    engine: "reference-template-mfcc-dtw",
    parameters: {
      referenceSamples: samples,
      referenceSampleRate: sampleRate,
      referenceStarts: [0, 0.2],
      referenceDuration: 0.4,
      targetSamples: samples,
      targetSampleRate: sampleRate,
      targetDuration: 0.4,
      options: { mfcc: { frameSize: 128, hopSize: 64, melBands: 12, coefficients: 6 }, maxLength: 40, window: 4, dtwImplementation: "banded" },
    },
  });
  assert.equal(throughEngine.engine, "reference-template-mfcc-dtw");
  assert.equal(throughEngine.lines.length, lines.length);
  assert.equal(throughEngine.parameters.dtwImplementation, "banded");
  assert.equal(throughEngine.parameters.referenceSamples, undefined);
  assert.ok(throughEngine.lines.every((line) => Number.isFinite(line.startTime)));

  const cachedFrames = extractMfcc(samples, sampleRate, { frameSize: 128, hopSize: 64, melBands: 12, coefficients: 6 });
  const fromFrames = await alignWithReferenceTemplates({
    referenceSamples: samples,
    referenceSampleRate: sampleRate,
    referenceStarts: [0, 0.2],
    referenceDuration: 0.4,
    targetSamples: samples,
    targetSampleRate: sampleRate,
    targetDuration: 0.4,
    lyrics: lines,
    options: { mfcc: { frameSize: 128, hopSize: 64, melBands: 12, coefficients: 6 }, maxLength: 40, window: 4, referenceMfcc: cachedFrames, targetMfcc: cachedFrames },
  });
  assert.deepEqual(fromFrames.lines.map((line) => line.startTime), result.lines.map((line) => line.startTime));

  const refined = await alignWithReferenceTemplates({
    referenceSamples: samples,
    referenceSampleRate: sampleRate,
    referenceStarts: [0, 0.2],
    referenceDuration: 0.4,
    targetSamples: samples,
    targetSampleRate: sampleRate,
    targetDuration: 0.4,
    lyrics: lines,
    options: { mfcc: { frameSize: 128, hopSize: 64, melBands: 12, coefficients: 6 }, maxLength: 40, window: 4, templateBoundaryRadius: 1 },
  });
  assert.equal(refined.parameters.templateBoundaryRadius, 1);
  assert.equal(refined.alignment.templateBoundaryRefinement.length, 1);
  assert.ok(refined.lines[1].startTime >= refined.lines[0].startTime);

  const separated = await alignWithSeparatedReferenceTarget({
    separator: createPassthroughSeparator(),
    targetInput: { samples, sampleRate },
    referenceSamples: samples,
    referenceSampleRate: sampleRate,
    referenceStarts: [0, 0.2],
    referenceDuration: 0.4,
    lyrics: lines,
    options: { mfcc: { frameSize: 128, hopSize: 64, melBands: 12, coefficients: 6 }, maxLength: 40, window: 4 },
  });
  assert.deepEqual(separated.lines.map((line) => line.startTime), result.lines.map((line) => line.startTime));
});

test("reference-template adapter rejects a lyric/reference line mismatch", () => {
  assert.throws(() => alignWithReferenceTemplates({
    referenceSamples: [0, 1], referenceSampleRate: 10, referenceStarts: [0], referenceDuration: 0.2,
    targetSamples: [0, 1], targetSampleRate: 10, targetDuration: 0.2,
    lyrics: [{ originalText: "one", order: 0 }, { originalText: "two", order: 1 }],
  }), /line count must match/u);
});
