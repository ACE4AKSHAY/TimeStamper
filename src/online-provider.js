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
  return Boolean(settings?.onlineSearchEnabled && navigator.onLine);
}
