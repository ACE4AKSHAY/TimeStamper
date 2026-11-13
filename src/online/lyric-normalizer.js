const LINE_TAG = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/gu;
const WORD_TAG = /<(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?>/gu;

/**
 * Converts line-timed and enhanced/word-timed LRC into one provider-neutral
 * shape. The original text is still retained by the provider result so the
 * editor can import/export it without losing source fidelity.
 */
export function parseTimedLyrics(text) {
  const timedLines = [];
  for (const raw of String(text || "").split(/\r?\n/u)) {
    const lineMatches = [...raw.matchAll(LINE_TAG)];
    if (!lineMatches.length) continue;
    const lineText = raw.replace(LINE_TAG, "").replace(WORD_TAG, "").trim();
    if (!lineText) continue;
    const words = parseTimedWords(raw);
    for (const match of lineMatches) {
      timedLines.push({ text: lineText, startTime: tagToSeconds(match), endTime: null, words });
    }
  }
  timedLines.sort((left, right) => left.startTime - right.startTime);
  timedLines.forEach((line, index) => {
    line.endTime = timedLines[index + 1]?.startTime ?? null;
  });
  return {
    timedLines,
    timedWords: timedLines.flatMap((line) => line.words || []),
  };
}

function parseTimedWords(raw) {
  const tags = [...raw.matchAll(WORD_TAG)];
  if (!tags.length) return [];
  return tags
    .map((tag, index) => ({
      text: raw
        .slice(tag.index + tag[0].length, tags[index + 1]?.index ?? raw.length)
        .replace(LINE_TAG, "")
        .trim(),
      startTime: tagToSeconds(tag),
      endTime: tags[index + 1] ? tagToSeconds(tags[index + 1]) : null,
    }))
    .filter((word) => word.text);
}

function tagToSeconds(match) {
  const fraction = (match[3] || "0").padEnd(3, "0").slice(0, 3);
  return Number(match[1]) * 60 + Number(match[2]) + Number(fraction) / 1000;
}

export function timingLevel(result) {
  if (result?.timedWords?.length) return "word";
  if (result?.timedLines?.length || result?.syncedLyrics) return "line";
  if (result?.plainLyrics) return "plain";
  return "unknown";
}
