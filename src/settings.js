const STORAGE_KEY = "lyricsync.general-settings.v1";

export const DEFAULT_SETTINGS = Object.freeze({
  theme: "midnight",
  waveformColor: "#4ca2f7",
  textScale: "medium",
  reduceMotion: false,
  onlineSearchEnabled: false,
  onlineSources: Object.freeze({ lrclib: true, "lyrics-ovh": true, "web-search": true }),
  shortcuts: Object.freeze({ playToggle: "Space", stamp: "T", playbackEarlier: "ArrowLeft", playbackLater: "ArrowRight" }),
});

export function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return { ...DEFAULT_SETTINGS, ...saved, onlineSources: { ...DEFAULT_SETTINGS.onlineSources, ...(saved.onlineSources || {}) }, shortcuts: { ...DEFAULT_SETTINGS.shortcuts, ...(saved.shortcuts || {}) } };
  } catch {
    return { ...DEFAULT_SETTINGS, shortcuts: { ...DEFAULT_SETTINGS.shortcuts } };
  }
}

export function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function applySettings(settings) {
  const root = document.documentElement;
  root.dataset.theme = settings.theme;
  root.dataset.textScale = settings.textScale;
  root.dataset.reduceMotion = settings.reduceMotion === true ? "true" : "false";
  root.style.setProperty("--wave-color", settings.waveformColor);
}
