import test from "node:test";
import assert from "node:assert/strict";
import { createProject } from "../src/domain.js";
import { parseLyrics } from "../src/lyrics.js";
import { exportLrc } from "../src/lrc.js";

test("export applies a positive offset without mutating source timestamps", () => {
  const project = createProject();
  project.metadata.title = "Offset song";
  project.timeline.lines = parseLyrics("One\nTwo").lines;
  project.timeline.lines[0].startTime = 1.2;
  project.timeline.lines[1].startTime = 3;
  project.lyrics.offsetMs = 250;
  assert.equal(exportLrc(project), "[ti:Offset song]\n\n[00:01.45]One\n[00:03.25]Two\n");
  assert.deepEqual(
    project.timeline.lines.map((line) => line.startTime),
    [1.2, 3],
  );
});

test("export clamps a negative offset at zero", () => {
  const project = createProject();
  project.timeline.lines = parseLyrics("One").lines;
  project.timeline.lines[0].startTime = 0.1;
  project.lyrics.offsetMs = -500;
  assert.equal(exportLrc(project), "[ti:Untitled project]\n\n[00:00.00]One\n");
});
