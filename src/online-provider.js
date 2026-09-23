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
  constructor({ fetchImpl = globalThis.fetch, baseUrl = "https://lrclib.net/api" } = {}) {
    super({ id: "lrclib", displayName: "LRCLIB" });
    if (typeof fetchImpl !== "function") throw new Error("Online lyric search requires a fetch implementation.");
    this.fetchImpl = fetchImpl;
    this.baseUrl = baseUrl.replace(/\/$/u, "");
  }

  async search(query) {
    const text = String(query || "").trim();
    if (!text) throw new Error("Enter a song title or artist before searching.");
    const response = await this.fetchJson(`${this.baseUrl}/search?q=${encodeURIComponent(text)}`);
    if (!Array.isArray(response)) return [];
    return response.map(normalizeResult).filter((item) => item.title || item.artist);
  }

  async fetchLyrics(result) {
    const normalized = normalizeResult(result);
    if (normalized.syncedLyrics || normalized.plainLyrics) return normalized;
    if (!normalized.title) throw new Error("The selected online result has no song title.");
    const params = new URLSearchParams({ track_name: normalized.title });
    if (normalized.artist) params.set("artist_name", normalized.artist);
    if (normalized.album) params.set("album_name", normalized.album);
    if (Number.isFinite(normalized.duration)) params.set("duration", String(normalized.duration));
    return normalizeResult(await this.fetchJson(`${this.baseUrl}/get?${params}`));
  }

  async fetchJson(url) {
    const response = await this.fetchImpl(url, { headers: { Accept: "application/json" } });
    if (!response?.ok) throw new Error(`Online lyric service returned ${response?.status || "an error"}.`);
    return response.json();
  }
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
  };
}

export function createDefaultOnlineProvider(options) {
  return new LrcLibProvider(options);
}
