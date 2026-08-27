export function parseCsv(text) {
  const rows = []; let row = []; let value = ""; let quoted = false;
  for (let index = 0; index < String(text).length; index++) {
    const character = text[index], next = text[index + 1];
    if (character === '"' && quoted && next === '"') { value += '"'; index++; continue; }
    if (character === '"') { quoted = !quoted; continue; }
    if (character === "," && !quoted) { row.push(value); value = ""; continue; }
    if ((character === "\n" || character === "\r") && !quoted) { if (character === "\r" && next === "\n") index++; row.push(value); if (row.some((cell) => cell.trim())) rows.push(row); row = []; value = ""; continue; }
    value += character;
  }
  if (value || row.length) { row.push(value); if (row.some((cell) => cell.trim())) rows.push(row); }
  if (!rows.length) return [];
  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((cells) => Object.fromEntries(headers.map((header, index) => [header, (cells[index] || "").trim()])));
}

export function createResearchCandidates(rows) {
  return rows.map((row) => {
    const special = String(row.instrumental_or_special_version_flag || "").toLowerCase() === "true";
    const timestamped = row.annotation_status === "timestamped_lyrics_lrc";
    const highMatch = row.match_status === "matched_high_confidence";
    return { lyricName: row.lyric_name, audioName: row.audio_name_candidate, lyricFormat: row.lyric_format, timestampCount: Number(row.timestamp_count) || 0, matchScore: Number(row.match_score) || 0, specialVersion: special, sourceStatus: row.annotation_status, reviewStatus: highMatch && timestamped && !special ? "candidate_ready" : "needs_manual_review", benchmarkReady: false };
  });
}
