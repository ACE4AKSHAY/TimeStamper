import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";
import { classifyLyricsText, createDatasetItem } from "../src/dataset.js";

const sourceRoot = resolve(process.argv[2] || join(process.env.USERPROFILE, "Music"));
const outputPath = resolve(process.argv[3] || "benchmarks/private/local-library.manifest.json");
const AUDIO_EXTENSIONS = new Set([".mp3", ".wav", ".flac", ".ogg", ".opus", ".m4a", ".aac"]);
const LYRIC_EXTENSIONS = new Set([".lrc", ".txt"]);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true }); const files = [];
  for (const entry of entries) { const path = join(directory, entry.name); if (entry.isDirectory()) files.push(...await walk(path)); else files.push(path); }
  return files;
}

const paths = await walk(sourceRoot);
const audioFiles = paths.filter((path) => AUDIO_EXTENSIONS.has(extname(path).toLowerCase())).map((path) => ({ name: path.split(/[\\/]/u).pop(), path: relative(sourceRoot, path) }));
const lyricPaths = paths.filter((path) => LYRIC_EXTENSIONS.has(extname(path).toLowerCase())); const items = [];
for (const path of lyricPaths) { const name = path.split(/[\\/]/u).pop(); const info = classifyLyricsText(await readFile(path, "utf8"), name); items.push(createDatasetItem({ name, path: relative(sourceRoot, path) }, audioFiles, info)); }
const summary = { audioFiles: audioFiles.length, lyricFiles: items.length, fullyTimestamped: items.filter((item) => item.timestampStatus === "fully_timestamped").length, partiallyTimestamped: items.filter((item) => item.timestampStatus === "partially_timestamped").length, untimestamped: items.filter((item) => item.timestampStatus === "untimestamped").length, probableInstrumental: items.filter((item) => item.probableInstrumental).length, exactAudioLyricCandidates: items.filter((item) => item.audioCandidates.length === 1).length, needsManualReview: items.filter((item) => item.reviewStatus === "needs_manual_review").length };
const manifest = { schemaVersion: 1, generatedAt: new Date().toISOString(), sourceRoot, privacy: "local manifest; source media and lyrics were not copied", summary, items };
await mkdir(dirname(outputPath), { recursive: true }); await writeFile(outputPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ outputPath, summary }, null, 2));
