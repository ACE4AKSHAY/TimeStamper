export const ONLINE_CACHE_STORAGE_KEY = "lyricsync.online-results.v1";
export const DEFAULT_ONLINE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Small, replaceable cache for optional online search results.
 * It stores only provider responses in the browser/Electron local store.
 */
export class OnlineLyricsCache {
  constructor({ storage = globalThis.localStorage, now = () => Date.now(), ttlMs = DEFAULT_ONLINE_CACHE_TTL_MS, maxEntries = 60, storageKey = ONLINE_CACHE_STORAGE_KEY } = {}) {
    this.storage = storage;
    this.now = now;
    this.ttlMs = Math.max(1, Number(ttlMs) || DEFAULT_ONLINE_CACHE_TTL_MS);
    this.maxEntries = Math.max(1, Math.floor(Number(maxEntries) || 60));
    this.storageKey = storageKey;
  }

  get(providerId, queryKey) {
    const key = cacheKey(providerId, queryKey);
    const state = this.read();
    const entry = state.entries[key];
    if (!entry) return null;
    if (entry.expiresAt <= this.now()) {
      delete state.entries[key];
      this.write(state);
      return null;
    }
    return Array.isArray(entry.results) ? entry.results : null;
  }

  set(providerId, queryKey, results) {
    const state = this.read();
    const key = cacheKey(providerId, queryKey);
    state.entries[key] = { providerId: String(providerId || "unknown"), queryKey: String(queryKey || ""), results: Array.isArray(results) ? results : [], savedAt: this.now(), expiresAt: this.now() + this.ttlMs };
    const keys = Object.keys(state.entries).sort((left, right) => state.entries[left].savedAt - state.entries[right].savedAt);
    keys.slice(0, Math.max(0, keys.length - this.maxEntries)).forEach((oldKey) => delete state.entries[oldKey]);
    this.write(state);
  }

  clear() {
    try { this.storage?.removeItem(this.storageKey); } catch { /* private browsing/storage quota should not break offline editing */ }
  }

  read() {
    try {
      const value = JSON.parse(this.storage?.getItem(this.storageKey) || "null");
      return value?.version === 1 && value.entries && typeof value.entries === "object" ? value : { version: 1, entries: {} };
    } catch {
      return { version: 1, entries: {} };
    }
  }

  write(state) {
    try { this.storage?.setItem(this.storageKey, JSON.stringify(state)); } catch { /* quota/private storage failure is non-fatal */ }
  }
}

function cacheKey(providerId, queryKey) {
  return `${String(providerId || "unknown")}::${String(queryKey || "").trim().toLocaleLowerCase()}`;
}
