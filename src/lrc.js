function pad(value) { return String(value).padStart(2, "0"); }

export function secondsToLrc(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) throw new TypeError("Timestamp must be a non-negative number");
  const centiseconds = Math.round(seconds * 100);
  const minutes = Math.floor(centiseconds / 6000);
  const remainder = centiseconds % 6000;
  return `[${pad(minutes)}:${pad(Math.floor(remainder / 100))}.${pad(remainder % 100)}]`;
}

export function lrcToSeconds(value) {
  const match = String(value).match(/^\[(\d+):(\d{2})[.:](\d{1,3})\]$/u);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]) + Number(match[3].padEnd(3, "0")) / 1000;
}

export function exportLrc(project) {
  const { metadata, timeline } = project;
  const header = [
    metadata.artist && `[ar:${metadata.artist}]`,
    metadata.title && `[ti:${metadata.title}]`,
    metadata.album && `[al:${metadata.album}]`,
    metadata.language && `[la:${metadata.language}]`,
  ].filter(Boolean);
  const lyricLines = [...timeline.lines]
    .filter((line) => Number.isFinite(line.startTime))
    .sort((a, b) => a.startTime - b.startTime || a.order - b.order)
    .map((line) => `${secondsToLrc(line.startTime)}${line.originalText}`);
  return [...header, "", ...lyricLines].join("\n") + "\n";
}
