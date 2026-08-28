import test from "node:test";
import assert from "node:assert/strict";
import { secondsToLrc, lrcToSeconds, exportLrc } from "../src/lrc.js";
import { parseLyrics } from "../src/lyrics.js";
import { createProject } from "../src/domain.js";
import { createEnergyInitialTimeline } from "../src/energy-aligner.js";
import { synchronize } from "../src/engine.js";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { saveProject, loadProject } from "../src/project-store.mjs";
import { classifyLyricsText, createReviewQueue, normalizeStem, validateReviewQueue } from "../src/dataset.js";
import { createResearchCandidates, parseCsv } from "../src/private-manifest.js";
import { extractMfcc } from "../src/features.js";
import { constrainedDtw } from "../src/dtw.js";
import { alignMfccSequences } from "../src/mfcc-dtw.js";
import { alignLineTemplates } from "../src/template-aligner.js";
import { fuseProfiles, normalizeProfile, resampleProfile } from "../src/profile-fusion.js";
import { extractExplainableProfiles, extractRmsProfile, extractSpectralFluxProfile } from "../src/audio-profiles.js";
import { alignByBoundaryDp } from "../src/boundary-dp-aligner.js";
import { extractPitchProfile, pitchVoicednessProfile } from "../src/pitch-profile.js";
import { alignMultiProfile } from "../src/multi-profile-aligner.js";
import { alignByIntroAwareBoundaryDp } from "../src/intro-aware-aligner.js";
import { alignByAdaptiveBoundaryDp } from "../src/adaptive-boundary-aligner.js";
import { alignByTextWeightedBoundaryDp, estimateTextWeights } from "../src/text-weighted-aligner.js";
import { refineBoundarySegments } from "../src/boundary-refiner.js";
import { alignByEnsemble } from "../src/ensemble-aligner.js";
import { summarizeConsensus, buildConsensusTimeline } from "../src/consensus-aligner.js";

test("LRC timestamps round to centiseconds", () => {
  assert.equal(secondsToLrc(12.426), "[00:12.43]");
  assert.equal(secondsToLrc(61.2), "[01:01.20]");
  assert.equal(lrcToSeconds("[01:01.20]"), 61.2);
});

test("parses LRC metadata and multiple timestamps", () => {
  const result = parseLyrics("[ar:Artist]\n[00:01.20][00:03.20]Hello");
  assert.equal(result.metadata.ar, "Artist");
  assert.equal(result.lines.length, 2);
  assert.equal(result.lines[1].startTime, 3.2);
});

test("preserves Unicode lyrics and accepts a single lyric line", () => {
  const result = parseLyrics("ప్రేమ వెలుగు\nदिल की बात\nஒரே வரி");
  assert.equal(result.lines.length, 3);
  assert.equal(result.lines[0].originalText, "ప్రేమ వెలుగు");
  assert.equal(result.lines[1].normalizedText, "दिल की बात");
  assert.equal(parseLyrics("ఒకే పంక్తి").lines.length, 1);
});

test("exports timestamped lines only", () => {
  const project = createProject();
  project.metadata.title = "Song";
  project.timeline.lines = parseLyrics("One\nTwo").lines;
  project.timeline.lines[0].startTime = 1.2;
  assert.equal(exportLrc(project), "[ti:Song]\n\n[00:01.20]One\n");
});

test("energy baseline creates ordered editable initial timestamps", () => {
  const lines = parseLyrics("one\ntwo\nthree").lines;
  const output = createEnergyInitialTimeline(lines, [0, .2, .7, .4, .1, .8], 60);
  assert.equal(output.length, 3);
  assert.ok(output[0].startTime <= output[1].startTime);
  assert.ok(output[1].startTime <= output[2].startTime);
  assert.equal(output[0].alignmentMethod, "energy_baseline");
});

test("platform-neutral engine returns reproducible structured alignment", () => {
  const lines = parseLyrics("one\ntwo").lines;
  const result = synchronize({ lyrics: lines, energyProfile: [0.1, 0.8, 0.2], duration: 30 });
  assert.equal(result.engine, "energy-baseline");
  assert.equal(result.lines.length, 2);
  assert.ok(result.lines.every((line) => line.alignmentMethod === "energy_baseline"));
});

test("file-backed ProjectStore keeps a reopenable project layout", async () => {
  const root = await mkdtemp(join(tmpdir(), "lyricsync-test-"));
  const project = createProject(); project.timeline.lines = parseLyrics("hello").lines; project.lyrics.lines = project.timeline.lines;
  await saveProject(project, root);
  const loaded = await loadProject(root);
  assert.equal(loaded.timeline.lines[0].originalText, "hello");
  assert.match(await readFile(join(root, "timeline", "timeline.json"), "utf8"), /hello/u);
});

test("dataset classification separates timestamp and review states", () => {
  assert.equal(classifyLyricsText("[00:01.00]one\n[00:02.00]two", "song.lrc").timestampStatus, "fully_timestamped");
  assert.equal(classifyLyricsText("one\ntwo", "song.lrc").timestampStatus, "untimestamped");
  assert.equal(classifyLyricsText("[00:01.00]one\ntwo", "piano.lrc").reviewRequired, true);
  assert.equal(normalizeStem("Song (Official Video) - SenSongsMp3.Co.mp3"), "song");
});

test("review queue excludes likely instrumentals and requires manual decisions", () => {
  const queue = createReviewQueue([
    { lyricPath: "a.lrc", audioCandidates: ["a.mp3"], probableInstrumental: false, timestampStatus: "fully_timestamped" },
    { lyricPath: "piano.lrc", audioCandidates: ["piano.mp3"], probableInstrumental: true, timestampStatus: "fully_timestamped" },
  ], 20);
  assert.equal(queue.length, 1);
  assert.equal(queue[0].review.timestampsVerified, null);
});

test("review validation separates pending, rejected and benchmark-ready items", () => {
  const base = { audioCandidates: ["a.mp3"], review: { audioMatchesLyrics: true, isVocalRecording: true, timestampsVerified: true }, reference: [1] };
  const result = validateReviewQueue([base, { ...base, review: { ...base.review, timestampsVerified: null } }, { ...base, review: { ...base.review, isVocalRecording: false } }]);
  assert.deepEqual(result.summary, { total: 3, approved: 1, benchmarkReady: 1, pending: 1, rejected: 1 });
});

test("private manifest CSV parsing preserves quoted commas and candidate state", () => {
  const rows = parseCsv('name,description\n"song, live","a quoted value"\n');
  assert.equal(rows[0].name, "song, live");
  const candidates = createResearchCandidates([{ lyric_name: "a.lrc", audio_name_candidate: "a.mp3", lyric_format: ".lrc", timestamp_count: "12", match_score: "1", instrumental_or_special_version_flag: "False", annotation_status: "timestamped_lyrics_lrc", match_status: "matched_high_confidence" }]);
  assert.equal(candidates[0].reviewStatus, "candidate_ready");
  assert.equal(candidates[0].benchmarkReady, false);
  assert.equal(candidates[0].audioName, "a.mp3");
});

test("MFCC extraction returns finite feature frames", () => {
  const samples = Array.from({ length: 1024 }, (_, i) => Math.sin(2 * Math.PI * 5 * i / 128));
  const result = extractMfcc(samples, 8000, { frameSize: 128, hopSize: 64, melBands: 10, coefficients: 6 });
  assert.ok(result.frames.length > 1);
  assert.equal(result.frames[0].length, 6);
  assert.ok(result.frames.flat().every(Number.isFinite));
});

test("constrained DTW returns an ordered path and MFCC adapter metadata", () => {
  const a = [[0], [1], [2], [3]]; const b = [[0], [1.1], [2.2]];
  const result = constrainedDtw(a, b, { window: 2 });
  assert.ok(result.path.length >= 4);
  assert.equal(result.path[0][0], 0);
  assert.equal(result.path.at(-1)[1], 2);
  assert.equal(alignMfccSequences({ frames: a, frameRate: 10 }, { frames: b, frameRate: 8 }).method, "mfcc_dtw");
});

test("template alignment creates monotonic line-level segments", () => {
  const toneA = [[0], [0.1]], toneB = [[1], [1.1]], audio = [...toneA, [0.2], ...toneB, [1.2]];
  const result = alignLineTemplates(audio, [toneA, toneB], { frameRate: 10, minLength: 2, maxLength: 4, window: 3 });
  assert.equal(result.segments.length, 2);
  assert.equal(result.segments[0].startTime, 0);
  assert.ok(result.segments[0].endTime <= result.segments[1].startTime);
  assert.equal(result.segments[1].endTime, 0.6);
});

test("engine exposes template MFCC-DTW line timestamps", () => {
  const lines = parseLyrics("a\nb").lines; const audio = [[0], [0.1], [0.2], [1], [1.1], [1.2]];
  const result = synchronize({ lyrics: lines, engine: "template-mfcc-dtw", parameters: { audioFrames: audio, lineTemplates: [[[0], [0.1]], [[1], [1.1]]], frameRate: 10, minLength: 2, maxLength: 4, window: 3 } });
  assert.equal(result.lines[0].startTime, 0);
  assert.equal(result.lines[1].alignmentMethod, "template_mfcc_dtw");
});

test("profile fusion normalizes and resamples explainable signals", () => {
  assert.deepEqual(resampleProfile([0, 10], 3), [0, 5, 10]);
  assert.deepEqual(normalizeProfile([2, 4, 6]), [0, 0.5, 1]);
  const result = fuseProfiles({ energy: [0, 1, 0], flux: [0, 0, 2] }, { energy: 2, flux: 1 });
  assert.equal(result.length, 3);
  assert.deepEqual(result.components, [{ name: "energy", weight: 2 }, { name: "flux", weight: 1 }]);
  assert.ok(result.profile.every((value) => Number.isFinite(value)));
});

test("combined profile engine remains deterministic and editable", () => {
  const lines = ["one", "two", "three"].map((originalText, order) => ({ id: `combined-${order}`, originalText, order }));
  const result = synchronize({ engine: "combined-profile", lyrics: lines, duration: 30, parameters: { profiles: { energy: [0.1, 0.8, 0.2, 0.7], flux: [0.2, 0.4, 0.9, 0.1] }, weights: { energy: 2, flux: 1 } } });
  assert.equal(result.engine, "combined-profile");
  assert.equal(result.lines.length, 3);
  assert.equal(result.lines[0].alignmentMethod, "combined_profile");
  assert.ok(result.lines.every((line) => Number.isFinite(line.startTime)));
});

test("explainable audio profiles extract finite energy and spectral change", () => {
  const samples = Array.from({ length: 4096 }, (_, index) => (index % 256 < 32 ? Math.sin(index / 3) : 0));
  const energy = extractRmsProfile(samples, { frameSize: 128, hopSize: 64, bins: 20 });
  const flux = extractSpectralFluxProfile(samples, { frameSize: 128, hopSize: 64, bins: 20 });
  assert.equal(energy.length, 20);
  assert.equal(flux.length, 20);
  assert.ok([...energy, ...flux].every(Number.isFinite));
  assert.deepEqual(Object.keys(extractExplainableProfiles(samples, { frameSize: 128, hopSize: 64, bins: 8 })), ["energy", "spectralFlux"]);
});

test("boundary dynamic programming returns monotonic constrained segments", () => {
  const lines = ["a", "b", "c"].map((originalText, order) => ({ id: `boundary-${order}`, originalText, order }));
  const profile = [0.1, 0.2, 0.9, 0.3, 0.1, 0.2, 0.95, 0.25, 0.1, 0.3, 1, 0.2];
  const result = alignByBoundaryDp(lines, profile, 12, { minLength: 2, maxLength: 6, boundaryWeight: 1 });
  assert.equal(result.segments.length, 3);
  assert.equal(result.segments[0].startFrame, 0);
  assert.ok(result.segments.every((segment, index) => index === 0 || segment.startFrame >= result.segments[index - 1].endFrame));
  const engineResult = synchronize({ engine: "boundary-dp", lyrics: lines, duration: 12, parameters: { profile, minLength: 2, maxLength: 6 } });
  assert.equal(engineResult.lines[0].alignmentMethod, "boundary_dynamic_programming");
});

test("intro-aware boundary DP preserves a detected leading intro", () => {
  const lines = ["a", "b", "c"].map((originalText, order) => ({ id: `intro-${order}`, originalText, order }));
  const profile = [0.1, 0.1, 0.1, 1, 0.2, 0.2, 0.9, 0.2, 0.2, 1, 0.2, 0.2];
  const result = alignByIntroAwareBoundaryDp(lines, profile, 12, { minLength: 2, maxLength: 6 });
  assert.equal(result.introFrame, 3);
  assert.equal(result.segments[0].startFrame, 3);
  assert.ok(result.segments.every((segment, index) => index === 0 || segment.startFrame >= result.segments[index - 1].endFrame));
  const engineResult = synchronize({ engine: "intro-aware-boundary-dp", lyrics: lines, duration: 12, parameters: { profile, minLength: 2, maxLength: 6 } });
  assert.equal(engineResult.lines[0].alignmentMethod, "intro_aware_boundary_dynamic_programming");
});

test("adaptive boundary DP selects intro handling only above its threshold", () => {
  const lines = ["a", "b", "c"].map((originalText, order) => ({ id: `adaptive-${order}`, originalText, order }));
  const profile = [0.1, 0.1, 0.1, 1, 0.2, 0.2, 0.9, 0.2, 0.2, 1, 0.2, 0.2];
  const result = alignByAdaptiveBoundaryDp(lines, profile, 12, { minLength: 2, maxLength: 6, minimumIntroFrames: 3 });
  assert.equal(result.selectedEngine, "intro-aware-boundary-dp");
  assert.equal(result.segments[0].startFrame, 3);
});

test("text-weighted Boundary-DP handles Unicode line lengths", () => {
  const lines = ["go now", "this is a much longer lyric line", "stay"].map((originalText, order) => ({ id: `text-weighted-${order}`, originalText, order }));
  const weights = estimateTextWeights(lines);
  assert.equal(weights.textLengths[0], 5);
  assert.ok(weights.weights[1] > weights.weights[0]);
  const result = alignByTextWeightedBoundaryDp(lines, Array.from({ length: 32 }, () => 0.5), 16, { boundaryWeight: 0 });
  assert.equal(result.segments.length, 3);
  assert.ok(result.segments.every((segment, index) => index === 0 || segment.startFrame >= result.segments[index - 1].endFrame));
  assert.ok(result.segments[1].endFrame - result.segments[1].startFrame > result.segments[0].endFrame - result.segments[0].startFrame);
  const engineResult = synchronize({ engine: "text-weighted-boundary-dp", lyrics: lines, duration: 16, parameters: { profile: Array.from({ length: 32 }, () => 0.5), boundaryWeight: 0 } });
  assert.equal(engineResult.lines[0].alignmentMethod, "text_weighted_boundary_dynamic_programming");
});

test("local boundary refinement moves coarse boundaries toward onsets", () => {
  const coarse = [{ lineIndex: 0, startFrame: 0, endFrame: 8 }, { lineIndex: 1, startFrame: 8, endFrame: 16 }, { lineIndex: 2, startFrame: 16, endFrame: 24 }];
  const profile = [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 1, 0.2, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 1, 0.2, 0.1, 0.1, 0.1, 0.1];
  const result = refineBoundarySegments(coarse, profile, 12, { windowFrames: 4 });
  assert.deepEqual(result.boundaries, [0, 6, 18, 24]);
  assert.ok(result.decisions.every((decision) => decision.confidence >= 0));
});

test("ensemble alignment returns monotonic consensus and review diagnostics", () => {
  const lines = ["short", "a longer lyric line", "last"].map((originalText, order) => ({ id: `ensemble-${order}`, originalText, order }));
  const profile = [0.1, 0.1, 0.1, 0.1, 0.1, 1, 0.2, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 1, 0.2, 0.1, 0.1, 0.1, 0.1, 0.1];
  const result = alignByEnsemble(lines, profile, 12, { boundaryWeight: 0, minimumIntroFrames: profile.length + 1, windowFrames: 4 });
  assert.equal(result.lines.length, 3);
  assert.ok(result.lines.every((line, index) => index === 0 || line.startTime >= result.lines[index - 1].startTime));
  assert.equal(result.lines[0].alignmentMethod, "ensemble_boundary_consensus");
  assert.ok(result.lines.every((line) => line.alignmentReview.failureCategory));
  const engineResult = synchronize({ engine: "ensemble-boundary", lyrics: lines, duration: 12, parameters: { profile, boundaryWeight: 0, minimumIntroFrames: profile.length + 1, windowFrames: 4 } });
  assert.equal(engineResult.lines[1].alignmentMethod, "ensemble_boundary_consensus");
});

test("consensus layer returns a median timestamp and bounded confidence", () => {
  const summary = summarizeConsensus([1, 1.2, 0.8], { confidenceScale: 1 });
  assert.equal(summary.startTime, 1);
  assert.ok(summary.confidence > 0 && summary.confidence <= 1);
  const lines = buildConsensusTimeline([{ id: "a", originalText: "a" }], [[1], [1.2], [0.8]]);
  assert.equal(lines[0].startTime, 1);
});

test("autocorrelation pitch profile detects a bounded voiced tone", () => {
  const sampleRate = 8000, samples = Array.from({ length: 4096 }, (_, index) => Math.sin(2 * Math.PI * 200 * index / sampleRate));
  const pitch = extractPitchProfile(samples, sampleRate, { frameSize: 512, hopSize: 256, minFrequency: 100, maxFrequency: 400 });
  const voiced = pitch.frames.filter((frame) => frame.voiced);
  assert.ok(voiced.length > 0);
  assert.ok(Math.abs(voiced[Math.floor(voiced.length / 2)].frequencyHz - 200) < 8);
  assert.equal(pitchVoicednessProfile(pitch).length, pitch.frames.length);
});

test("multi-profile boundary adapter preserves explicit component weights", () => {
  const lines = ["a", "b", "c"].map((originalText, order) => ({ id: `multi-${order}`, originalText, order }));
  const result = alignMultiProfile(lines, { energy: [0.2, 0.3, 0.4, 1, 0.2, 0.3, 0.4, 0.9, 0.2, 0.3, 0.4, 1], spectralFlux: [0.1, 0.2, 0.3, 0.9, 0.1, 0.2, 0.3, 1, 0.1, 0.2, 0.3, 0.9], voicedness: [0.3, 0.3, 0.4, 1, 0.3, 0.3, 0.4, 0.9, 0.3, 0.3, 0.4, 1] }, 12, { minLength: 2, maxLength: 6, weights: { energy: 0.5, spectralFlux: 0.3, voicedness: 0.2 } });
  assert.equal(result.lines[0].alignmentMethod, "multi_profile_boundary_dp");
  assert.deepEqual(result.fusion.components, [{ name: "energy", weight: 0.5 }, { name: "spectralFlux", weight: 0.3 }, { name: "voicedness", weight: 0.2 }]);
  assert.equal(result.alignment.segments.length, 3);
});
