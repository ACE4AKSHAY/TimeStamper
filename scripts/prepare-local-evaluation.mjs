import { readFile, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseCsv } from "../src/private-manifest.js";
import { parseLyrics } from "../src/lyrics.js";

// This command creates metadata-only evaluation stubs. It never copies audio or
// lyric files into the repository; the generated JSON is ignored by Git.
const root = resolve(process.argv[2] || "C:/Users/aksha/Desktop/manus lyric-sync/dataset_private");
const output = resolve(process.argv[3] || "benchmarks/private/local-evaluation.json");
const limit = Math.max(1, Number(process.argv[4] || 10));

const inventoryPath = join(root, "private_match_inventory.csv");
const audioRoot = join(root, "audio");
const lyricsRoot = join(root, "lyrics");
const rows = parseCsv(await readFile(inventoryPath, "utf8"));
const eligibleRows = rows.filter((row) => row.annotation_status === "timestamped_lyrics_lrc" && row.match_status === "matched_high_confidence" && String(row.instrumental_or_special_version_flag).toLowerCase() !== "true");

const items = [];
for (const row of rows) {
  const timestamped = row.annotation_status === "timestamped_lyrics_lrc";
  const highConfidence = row.match_status === "matched_high_confidence";
  const specialVersion = String(row.instrumental_or_special_version_flag).toLowerCase() === "true";
  if (!timestamped || !highConfidence || specialVersion || items.length >= limit) continue;

  const audioPath = join(audioRoot, row.audio_name_candidate);
  const lyricPath = join(lyricsRoot, row.lyric_name);
  try {
    const [audioInfo, lyricText] = await Promise.all([stat(audioPath), readFile(lyricPath, "utf8")]);
    const parsed = parseLyrics(lyricText, "private_dataset");
    items.push({
      id: `private-${String(items.length + 1).padStart(3, "0")}`,
      audioName: row.audio_name_candidate,
      lyricName: row.lyric_name,
      audioPath,
      lyricPath,
      audioBytes: audioInfo.size,
      lyricEncoding: "utf8",
      lyricLineCount: parsed.lines.length,
      lyricTimestampCount: parsed.lines.filter((line) => Number.isFinite(line.startTime)).length,
      sourceStatus: row.annotation_status,
      matchScore: Number(row.match_score) || 0,
      specialVersion,
      benchmarkReady: false,
      review: {
        audioMatchesLyrics: null,
        isVocalRecording: null,
        timestampsVerified: null,
        corrections: 0,
        notes: "",
      },
    });
  } catch (error) {
    // Missing files stay out of the runnable set; report them in the summary.
  }
}

const hasFfmpeg = await commandExists("ffmpeg");
const hasFfprobe = await commandExists("ffprobe");
const document = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  privacy: "local metadata and absolute paths only; source media and lyrics were not copied",
  sourceRoot: root,
  decoder: {
    ffmpeg: hasFfmpeg,
    ffprobe: hasFfprobe,
    note: hasFfmpeg ? "A command-line PCM decoder is available for future automated runs." : "No command-line PCM decoder was found. Chromium can still play files in the app, but automated Node-side acoustic extraction needs FFmpeg or another decoder.",
  },
  selection: "high-confidence filename matches with timestamped LRC and no special-version marker",
  summary: {
    selected: items.length,
    eligibleRows: eligibleRows.length,
    notSelectedByLimit: Math.max(0, eligibleRows.length - items.length),
    allRows: rows.length,
  },
  items,
};

await writeFile(output, JSON.stringify(document, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ output, decoder: document.decoder, summary: document.summary }, null, 2));

async function commandExists(command) {
  try {
    const probe = process.platform === "win32" ? "where" : "which";
    const child = (await import("node:child_process")).execFile;
    await new Promise((resolvePromise, reject) => child(probe, [command], (error) => error ? reject(error) : resolvePromise()));
    return true;
  } catch {
    return false;
  }
}
