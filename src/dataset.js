const TIMESTAMP = /\[\d{1,3}:\d{2}(?:[.:]\d{1,3})?\]/u;
const INSTRUMENTAL_HINT = /(?:piano|instrumental|karaoke|bgm|ost|theme|violin|flute|ringtone|no.?vocals?)/iu;

export function normalizeStem(fileName) {
  return String(fileName).replace(/\.[^.]+$/u, "").toLocaleLowerCase().normalize("NFKC")
    .replace(/\[[^\]]*\]|\([^)]*\)|\{[^}]*\}/gu, " ")
    .replace(/(?:spotdown|sen\s*songs?mp3(?:\.co)?|video|official|lyrics?)/gu, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/gu, " ").trim();
}

export function classifyLyricsText(text, fileName = "") {
  const rows = String(text).replace(/^\uFEFF/u, "").split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
  const lyricRows = rows.filter((line) => !/^\[[a-z]+:/iu.test(line));
  const timestampedRows = lyricRows.filter((line) => TIMESTAMP.test(line));
  const status = !lyricRows.length ? "invalid" : timestampedRows.length === 0 ? "untimestamped" : timestampedRows.length === lyricRows.length ? "fully_timestamped" : "partially_timestamped";
  return { type: fileName.toLowerCase().endsWith(".lrc") ? "lrc" : "txt", lineCount: lyricRows.length, timestampedLineCount: timestampedRows.length, timestampStatus: status, probableInstrumental: INSTRUMENTAL_HINT.test(fileName), reviewRequired: status !== "fully_timestamped" || INSTRUMENTAL_HINT.test(fileName) };
}

export function createDatasetItem(lyricFile, audioFiles, lyricInfo) {
  const stem = normalizeStem(lyricFile.name);
  const candidates = audioFiles.filter((file) => normalizeStem(file.name) === stem).map((file) => file.path);
  return { lyricPath: lyricFile.path, ...lyricInfo, normalizedStem: stem, audioCandidates: candidates, reviewStatus: candidates.length === 1 && !lyricInfo.reviewRequired ? "candidate" : "needs_manual_review" };
}
