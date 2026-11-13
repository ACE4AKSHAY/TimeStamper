/** Return Unicode-safe non-whitespace tokens for interpolation. */
export function tokenizeWords(text) {
  const value = String(text || "");
  if (typeof Intl?.Segmenter === "function") {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "word" });
    return [...segmenter.segment(value)]
      .filter((item) => item.isWordLike && item.segment.trim())
      .map((item) => item.segment);
  }
  return value.match(/\S+/gu) || [];
}

/** Interpolate words inside a line using grapheme-weighted spans. */
export function interpolateWordTimings(line, options = {}) {
  const sourceWords = Array.isArray(line.words) ? line.words.filter((word) => Number.isFinite(word.startTime)) : [];
  if (sourceWords.length) {
    return {
      words: sourceWords.map((word) => ({ ...word, confidence: word.confidence ?? line.confidence ?? null })),
      method: "source",
      confidence: line.confidence ?? null,
    };
  }
  const tokens = tokenizeWords(line.text ?? line.originalText ?? "");
  const startTime = Number.isFinite(line.startTime) ? line.startTime : null;
  const endTime = Number.isFinite(line.endTime) ? line.endTime : null;
  if (!tokens.length || startTime === null || endTime === null || endTime < startTime) {
    return { words: [], method: "interpolated", confidence: 0 };
  }
  const lengths = tokens.map((token) => graphemeLength(token));
  const total = lengths.reduce((sum, value) => sum + value, 0) || tokens.length;
  let cursor = startTime;
  const span = endTime - startTime;
  const confidence = Math.max(0, Math.min(1, (line.confidence ?? 0.5) * 0.7));
  const words = tokens.map((token, index) => {
    const wordStart = cursor;
    cursor += span * (lengths[index] / total);
    return { text: token, startTime: wordStart, endTime: index === tokens.length - 1 ? endTime : cursor, confidence };
  });
  return { words, method: "interpolated", confidence };
}

export function addWordTimings(lines, options = {}) {
  return lines.map((line) => {
    const result = interpolateWordTimings(line, options);
    return { ...line, words: result.words, wordTimingMethod: result.method, wordConfidence: result.confidence };
  });
}

function graphemeLength(value) {
  if (typeof Intl?.Segmenter === "function")
    return [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(value)].length;
  return [...value].length;
}
