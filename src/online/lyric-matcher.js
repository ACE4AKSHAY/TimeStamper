const VERSION_MARKERS = [
  ["instrumental", /\binstrumental\b|\bkaraoke\b|\bbacking track\b/iu],
  ["piano", /(?:\(|\[)\s*piano\b|\bpiano\s+(?:version|track|mix)\b/iu],
  ["live", /(?:\(|\[|\bversion\b|\bver\.?\b|\btrack\b|\bmix\b|\bedit\b|\s)live(?:\)|\]|\s|$)|\bconcert\b/iu],
  ["remix", /\bremix\b|\brework\b|(?:\(|\[)\s*(?:radio|extended|club)?\s*edit\b/iu],
  ["cover", /(?:\(|\[)\s*cover\b|\bcover\s+(?:version|track|mix)\b|\btribute\b/iu],
  ["acoustic", /\bacoustic\b|\bunplugged\b/iu],
  ["slowed", /\bslowed\b|\breverb\b|\bsped up\b/iu],
  ["demo", /\bdemo\b|\brough mix\b/iu],
];

const PROVIDER_RELIABILITY = Object.freeze({
  lrclib: 0.85,
  "lyrics-ovh": 0.55,
  "web-search": 0.35,
});

export function extractVersionMarkers(...values) {
  const text = values.filter(Boolean).join(" ");
  return VERSION_MARKERS.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
}

export function scoreLyricResult(result, context = {}) {
  const query = { artist: context.artist || "", title: context.title || "" };
  const resultArtist = comparable(result.artist);
  const resultTitle = comparable(result.title);
  const artist = comparable(query.artist);
  const title = comparable(query.title);
  let score = 0;
  const reasons = [];
  if (title && resultTitle === title) {
    score += 35;
    reasons.push("exact title");
  } else if (title && resultTitle.includes(title)) {
    score += 20;
    reasons.push("title contains query");
  }
  if (artist && resultArtist === artist) {
    score += 30;
    reasons.push("exact artist");
  } else if (artist && resultArtist.includes(artist)) {
    score += 16;
    reasons.push("artist contains query");
  }

  const timing = result.timingLevel || (result.syncedLyrics ? "line" : result.plainLyrics ? "plain" : "unknown");
  if (timing === "word") {
    score += 25;
    reasons.push("word timing");
  } else if (timing === "line" || result.syncedLyrics) {
    score += 16;
    reasons.push("line timing");
  } else if (timing === "plain") {
    score += 4;
    reasons.push("plain lyrics");
  }

  if (Number.isFinite(context.duration) && Number.isFinite(result.duration)) {
    const difference = Math.abs(context.duration - result.duration);
    if (difference <= 2) {
      score += 12;
      reasons.push("duration matches");
    } else if (difference > 10) {
      score -= 10;
      reasons.push("duration differs");
    }
  }

  const expectedVersions = extractVersionMarkers(context.audioName, context.version);
  const resultVersions = extractVersionMarkers(result.title, result.album);
  const overlap = expectedVersions.filter((marker) => resultVersions.includes(marker));
  const conflict = expectedVersions.some(
    (marker) => !resultVersions.includes(marker) && marker !== "instrumental" && resultVersions.length,
  );
  if (overlap.length) {
    score += 10;
    reasons.push(`version: ${overlap.join(", ")}`);
  }
  if (conflict) {
    score -= 20;
    reasons.push("recording-version mismatch");
  }
  if (expectedVersions.includes("instrumental") && !resultVersions.includes("instrumental")) {
    score -= 35;
    reasons.push("instrumental audio has no vocal match");
  }

  score += Math.round((PROVIDER_RELIABILITY[result.providerId] ?? 0.4) * 10);
  return {
    score: Math.max(0, Math.min(100, score)),
    matchReason: reasons.join("; ") || "provider result",
    expectedVersions,
    resultVersions,
  };
}

export function rankLyricResults(results, context = {}) {
  return results
    .map((result) => ({ ...result, ...scoreLyricResult(result, context) }))
    .sort((left, right) => right.score - left.score);
}

function comparable(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim();
}
