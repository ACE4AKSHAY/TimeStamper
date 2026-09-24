/**
 * Boundary for deliberately optional online integrations.
 *
 * Core editing, synchronization, export and project storage must never import
 * or require a provider. A future provider may query a user-selected source
 * only after an explicit user action and may return lyrics/LRC text for the
 * normal local parser to handle.
 */
export class OnlineLyricsProvider {
  constructor({ id, displayName }) {
    this.id = id;
    this.displayName = displayName;
  }

  async search(_query) {
    throw new Error("Online lyric search is not configured.");
  }

  async fetchLyrics(_result) {
    throw new Error("Online lyric search is not configured.");
  }
}

export function canUseOnlineSearch(settings) {
  return Boolean(settings?.onlineSearchEnabled && (globalThis.navigator?.onLine ?? true));
}

/**
 * Optional LRCLIB adapter. It is intentionally not imported by the offline
 * alignment core; callers must explicitly enable online search first.
 */
export class LrcLibProvider extends OnlineLyricsProvider {
  constructor({ fetchImpl = globalThis.fetch, baseUrl = "https://lrclib.net/api", timeoutMs = 12000 } = {}) {
    super({ id: "lrclib", displayName: "LRCLIB" });
    if (typeof fetchImpl !== "function") throw new Error("Online lyric search requires a fetch implementation.");
    this.fetchImpl = fetchImpl;
    this.baseUrl = baseUrl.replace(/\/$/u, "");
    this.timeoutMs = normalizeTimeout(timeoutMs);
  }

  async search(query, _context = {}, options = {}) {
    const text = String(query || "").trim();
    if (!text) throw new Error("Enter a song title or artist before searching.");
    const response = await this.fetchJson(`${this.baseUrl}/search?q=${encodeURIComponent(text)}`, options);
    if (!Array.isArray(response)) return [];
    return response.map(normalizeResult).filter((item) => item.title || item.artist);
  }

  async fetchLyrics(result, options = {}) {
    const normalized = normalizeResult(result);
    if (normalized.syncedLyrics || normalized.plainLyrics) return normalized;
    if (!normalized.title) throw new Error("The selected online result has no song title.");
    const params = new URLSearchParams({ track_name: normalized.title });
    if (normalized.artist) params.set("artist_name", normalized.artist);
    if (normalized.album) params.set("album_name", normalized.album);
    if (Number.isFinite(normalized.duration)) params.set("duration", String(normalized.duration));
    return normalizeResult(await this.fetchJson(`${this.baseUrl}/get?${params}`, options));
  }

  async fetchJson(url, { signal } = {}) {
    const request = createRequestSignal(this.timeoutMs, signal);
    try {
      const response = await this.fetchImpl(url, { headers: { Accept: "application/json" }, signal: request.signal });
      if (!response?.ok) throw new Error(`Online lyric service returned ${response?.status || "an error"}.`);
      return response.json();
    } finally {
      request.cleanup();
    }
  }
}

/** Plain-lyrics lookup. lyrics.ovh does not provide synchronized timestamps. */
export class LyricsOvhProvider extends OnlineLyricsProvider {
  constructor({ fetchImpl = globalThis.fetch, baseUrl = "https://api.lyrics.ovh", timeoutMs = 12000 } = {}) {
    super({ id: "lyrics-ovh", displayName: "lyrics.ovh" });
    if (typeof fetchImpl !== "function") throw new Error("Online lyric search requires a fetch implementation.");
    this.fetchImpl = fetchImpl;
    this.baseUrl = baseUrl.replace(/\/$/u, "");
    this.timeoutMs = normalizeTimeout(timeoutMs);
  }

  async search(query, context = {}, { signal } = {}) {
    const { artist, title } = parseArtistTitle(query, context);
    if (!artist || !title) return [];
    const request = createRequestSignal(this.timeoutMs, signal);
    let response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`, { headers: { Accept: "application/json" }, signal: request.signal });
    } finally {
      request.cleanup();
    }
    if (!response?.ok) return [];
    const data = await response.json();
    const lyrics = typeof data?.lyrics === "string" ? data.lyrics.trim() : "";
    return lyrics ? [{ id: `${artist}-${title}`, title, artist, album: "", duration: null, plainLyrics: lyrics, syncedLyrics: "", sourceUrl: "https://lyrics.ovh/", providerId: this.id, providerName: this.displayName, resultKind: "plain" }] : [];
  }

  async fetchLyrics(result) { return normalizeResult(result); }
}

/** Search-link provider: opens sources that do not offer a safe public lyrics API. */
export class WebLyricsSearchProvider extends OnlineLyricsProvider {
  constructor() { super({ id: "web-search", displayName: "Web lyric sources" }); }

  async search(query) {
    const text = String(query || "").trim();
    if (!text) return [];
    const encoded = encodeURIComponent(text);
    return [
      ["Genius", `https://genius.com/search?q=${encoded}`],
      ["Musixmatch", `https://www.musixmatch.com/search/${encoded}`],
      ["Lyrics.com", `https://www.lyrics.com/serp.php?st=${encoded}&qtype=2`],
    ].map(([name, sourceUrl]) => ({ id: `${this.id}-${name.toLowerCase()}`, title: `Search ${name}`, artist: text, album: "", duration: null, plainLyrics: "", syncedLyrics: "", sourceUrl, providerId: this.id, providerName: name, resultKind: "link" }));
  }

  async fetchLyrics(result) { return normalizeResult(result); }
}

export function normalizeResult(result = {}) {
  return {
    id: result.id ?? null,
    title: String(result.trackName ?? result.title ?? "").trim(),
    artist: String(result.artistName ?? result.artist ?? "").trim(),
    album: String(result.albumName ?? result.album ?? "").trim(),
    duration: Number.isFinite(Number(result.duration)) ? Number(result.duration) : null,
    plainLyrics: typeof result.plainLyrics === "string" ? result.plainLyrics : "",
    syncedLyrics: typeof result.syncedLyrics === "string" ? result.syncedLyrics : "",
    sourceUrl: typeof result.url === "string" ? result.url : "",
    providerId: result.providerId || "lrclib",
    providerName: result.providerName || "LRCLIB",
    resultKind: result.resultKind || (result.syncedLyrics ? "timed" : result.plainLyrics ? "plain" : "unknown"),
  };
}

export function createDefaultOnlineProvider(options) {
  return new LrcLibProvider(options);
}

export function createOnlineProviders(options = {}) {
  const { lrcLib, lyricsOvh, ...shared } = options;
  return [new LrcLibProvider({ ...shared, ...(lrcLib || {}) }), new LyricsOvhProvider({ ...shared, ...(lyricsOvh || {}) }), new WebLyricsSearchProvider()];
}

export function selectOnlineProviders(providers, enabledSources = {}) {
  return providers.filter((provider) => enabledSources[provider.id] !== false);
}

export function parseArtistTitle(query, context = {}) {
  const artist = String(context.artist || "").trim();
  const title = String(context.title || "").trim();
  if (artist && title) return { artist, title };
  const parts = String(query || "").split(/\s+[-|]\s+/u).map((part) => part.trim()).filter(Boolean);
  return parts.length >= 2 ? { artist: parts[0], title: parts.slice(1).join(" - ") } : { artist: "", title: "" };
}

function normalizeTimeout(value) {
  return Math.max(100, Number.isFinite(Number(value)) ? Number(value) : 12000);
}

function createRequestSignal(timeoutMs, parentSignal) {
  const controller = new AbortController();
  const onParentAbort = () => controller.abort(parentSignal.reason || abortError("Online search cancelled."));
  if (parentSignal?.aborted) onParentAbort();
  else parentSignal?.addEventListener("abort", onParentAbort, { once: true });
  const timer = setTimeout(() => controller.abort(abortError(`Online search timed out after ${timeoutMs} ms.`, "TimeoutError")), timeoutMs);
  return {
    signal: controller.signal,
    cleanup() {
      clearTimeout(timer);
      parentSignal?.removeEventListener("abort", onParentAbort);
    },
  };
}

function abortError(message, name = "AbortError") {
  const error = new Error(message);
  error.name = name;
  return error;
}
