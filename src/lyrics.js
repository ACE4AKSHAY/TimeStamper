import { createLine, normalizeText } from "./domain.js";

const TIMESTAMP = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/gu;
const METADATA = /^\[([a-zA-Z]+):(.*)\]$/u;

export function parseLyrics(text, source = "pasted") {
  const metadata = {};
  const lines = [];
  for (const raw of String(text).replace(/^\uFEFF/u, "").split(/\r?\n/u)) {
    const meta = raw.match(METADATA);
    if (meta && !/\[\d/u.test(raw)) {
      const key = meta[1].toLowerCase();
      if (["ar", "ti", "al", "la"].includes(key)) metadata[key] = meta[2].trim();
      continue;
    }
    const times = [...raw.matchAll(TIMESTAMP)].map(toSeconds);
    const lyric = normalizeText(raw.replace(TIMESTAMP, ""));
    if (!lyric) continue;
    if (times.length) {
      times.forEach((startTime) => {
        const line = createLine(lyric, lines.length);
        line.startTime = startTime;
        line.alignmentMethod = "imported_lrc";
        lines.push(line);
      });
    } else {
      lines.push(createLine(lyric, lines.length));
    }
  }
  return { metadata, lines, source };
}

function toSeconds(match) {
  const fraction = (match[3] || "0").padEnd(3, "0").slice(0, 3);
  return Number(match[1]) * 60 + Number(match[2]) + Number(fraction) / 1000;
}

export function linesToText(lines) {
  return lines.map((line) => line.originalText).join("\n");
}
