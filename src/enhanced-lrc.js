import { secondsToLrc } from "./lrc.js";

/** Export enhanced LRC word tags; line-only output remains the default export. */
export function exportEnhancedLrc(project, options = {}) {
  const { metadata, timeline } = project;
  const offsetSeconds = Number(project.lyrics?.offsetMs || 0) / 1000;
  const header = [
    metadata.artist && `[ar:${metadata.artist}]`,
    metadata.title && `[ti:${metadata.title}]`,
    metadata.album && `[al:${metadata.album}]`,
    metadata.language && `[la:${metadata.language}]`,
  ].filter(Boolean);
  const lines = [...(timeline?.lines || [])]
    .filter((line) => Number.isFinite(line.startTime))
    .sort((a, b) => a.startTime - b.startTime || a.order - b.order)
    .map((line) => {
      const lineTag = secondsToLrc(Math.max(0, line.startTime + offsetSeconds));
      const words = Array.isArray(line.words)
        ? line.words
            .filter((word) => Number.isFinite(word.startTime) && word.text)
            .map((word) => {
              const tag = wordTag(Math.max(0, word.startTime + offsetSeconds));
              return `${tag}${word.text}`;
            })
        : [];
      return `${lineTag}${words.length ? words.join(" ") : (line.originalText ?? line.text ?? "")}`;
    });
  return [...header, "", ...lines].join("\n") + "\n";
}

function wordTag(seconds) {
  return secondsToLrc(seconds).replace(/^\[/u, "<").replace(/\]$/u, ">");
}
