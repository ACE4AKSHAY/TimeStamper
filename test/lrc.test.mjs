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
import { classifyLyricsText, normalizeStem } from "../src/dataset.js";
import { extractMfcc } from "../src/features.js";
import { constrainedDtw } from "../src/dtw.js";
import { alignMfccSequences } from "../src/mfcc-dtw.js";

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
