import test from "node:test";
import assert from "node:assert/strict";
import { createLyricsProvenance, createProject } from "../src/domain.js";

test("new projects start with local lyric provenance", () => {
  const project = createProject();
  assert.equal(project.lyrics.provenance, null);
});

test("online lyric provenance is serializable and records source context", () => {
  const provenance = createLyricsProvenance({ providerId: "lyrics-ovh", providerName: "lyrics.ovh", sourceUrl: "https://lyrics.ovh/", resultKind: "plain", query: "Singer - Song", retrievedAt: "2026-09-24T00:00:00.000Z" });
  assert.deepEqual(provenance, { type: "online", providerId: "lyrics-ovh", providerName: "lyrics.ovh", sourceUrl: "https://lyrics.ovh/", resultKind: "plain", query: "Singer - Song", retrievedAt: "2026-09-24T00:00:00.000Z" });
});
