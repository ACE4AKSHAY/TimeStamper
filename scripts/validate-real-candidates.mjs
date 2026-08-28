import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { classifyLyricsText, normalizeStem } from "../src/dataset.js";
import { parseLyrics } from "../src/lyrics.js";

const root = resolve(process.argv[2] || "dataset_private");
const outputPath = resolve(process.argv[3] || "benchmarks/private/real-candidate-validation.json");
const audioRoot = join(root, "audio"), lyricsRoot = join(root, "lyrics");
const audioExtensions = new Set([".mp3", ".m4a", ".wav", ".wave", ".flac", ".ogg", ".opus", ".aac"]);
const lyricExtensions = new Set([".lrc", ".txt"]);
const [audioFiles, lyricFiles] = await Promise.all([collectFiles(audioRoot, audioExtensions), collectFiles(lyricsRoot, lyricExtensions)]);
const audioByStem = new Map();
for (const file of audioFiles) { const stem = normalizeStem(file.name); if (!audioByStem.has(stem)) audioByStem.set(stem, []); audioByStem.get(stem).push(file); }
const items = [];
for (const lyric of lyricFiles) {
  const text = await readFile(lyric.path, "utf8");
  const parsed = parseLyrics(text, "candidate_validation");
  const info = classifyLyricsText(text, lyric.name);
  const timestamped = parsed.lines.filter((line) => Number.isFinite(line.startTime));
  const monotonic = timestamped.every((line, index) => index === 0 || line.startTime >= timestamped[index - 1].startTime);
  const candidates = audioByStem.get(normalizeStem(lyric.name)) || [];
  items.push({ id: `candidate-${String(items.length + 1).padStart(3, "0")}`, lyricName: lyric.name, lyricPath: lyric.path, audioCandidates: candidates.map((file) => file.path), audioNames: candidates.map((file) => file.name), lyricBytes: Buffer.byteLength(text, "utf8"), lyricEncoding: text.includes("\uFFFD") ? "utf8_with_replacement_warning" : "utf8", lyricLineCount: parsed.lines.length, lyricTimestampCount: timestamped.length, timestampStatus: info.timestampStatus, timestampsMonotonic: monotonic, probableInstrumental: info.probableInstrumental || candidates.some((file) => /(?:piano|instrumental|karaoke|bgm|ost|theme|violin|flute|ringtone|no.?vocals?)/iu.test(file.name)), pairingStatus: candidates.length === 1 ? "single_candidate" : candidates.length === 0 ? "audio_not_found" : "multiple_candidates", readyForManualReview: candidates.length === 1 && info.timestampStatus !== "invalid" && monotonic });
}
const summary = { audioFiles: audioFiles.length, lyricFiles: lyricFiles.length, singleCandidate: items.filter((item) => item.pairingStatus === "single_candidate").length, unmatchedLyrics: items.filter((item) => item.pairingStatus === "audio_not_found").length, multipleAudioCandidates: items.filter((item) => item.pairingStatus === "multiple_candidates").length, fullyTimestamped: items.filter((item) => item.timestampStatus === "fully_timestamped").length, monotonicTimestampFiles: items.filter((item) => item.timestampsMonotonic).length, probableSpecialVersions: items.filter((item) => item.probableInstrumental).length, readyForManualReview: items.filter((item) => item.readyForManualReview).length };
const output = { schemaVersion: 1, generatedAt: new Date().toISOString(), privacy: "metadata and local paths only; audio bytes and lyric text are not written", root, summary, items };
await mkdirFor(outputPath);
await writeFile(outputPath, JSON.stringify(output, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ output: outputPath, summary }, null, 2));

async function collectFiles(directory, extensions) {
  const output = [];
  async function visit(current) {
    let entries;
    try { entries = await readdir(current, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (extensions.has(extname(entry.name).toLowerCase())) output.push({ name: entry.name, path, bytes: (await stat(path)).size });
    }
  }
  await visit(directory);
  return output;
}

async function mkdirFor(path) { const { mkdir } = await import("node:fs/promises"); await mkdir(dirname(path), { recursive: true }); }
