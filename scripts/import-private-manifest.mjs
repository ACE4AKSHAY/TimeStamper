import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseCsv, createResearchCandidates } from "../src/private-manifest.js";

const root = resolve(process.argv[2] || "C:/Users/aksha/Desktop/manus lyric-sync/dataset_private");
const output = resolve(process.argv[3] || "benchmarks/private/private-research-candidates.json");
const rows = parseCsv(await readFile(join(root, "private_match_inventory.csv"), "utf8"));
const [audioNames, lyricNames] = await Promise.all([readdir(join(root, "audio")), readdir(join(root, "lyrics"))]);
const audioSet = new Set(audioNames);
const lyricSet = new Set(lyricNames);
const candidates = createResearchCandidates(rows).map((item) => ({ ...item, audioExists: audioSet.has(item.audioName), lyricExists: lyricSet.has(item.lyricName) }));
const summary = { total: candidates.length, candidateReady: candidates.filter((item) => item.reviewStatus === "candidate_ready").length, needsManualReview: candidates.filter((item) => item.reviewStatus === "needs_manual_review").length, timestamped: candidates.filter((item) => item.sourceStatus === "timestamped_lyrics_lrc").length, specialVersion: candidates.filter((item) => item.specialVersion).length, missingAudio: candidates.filter((item) => !item.audioExists).length, missingLyrics: candidates.filter((item) => !item.lyricExists).length };
await writeFile(output, JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(), sourceRoot: root, privacy: "local metadata only; source media and lyrics were not copied", summary, items: candidates }, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ output, summary }, null, 2));
