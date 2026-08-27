const STORAGE_KEY = "lyricsync.general-settings.v1";

export const DEFAULT_SETTINGS = Object.freeze({
  theme: "midnight",
  waveformColor: "#4ca2f7",
  textScale: "medium",
  shortcuts: Object.freeze({ playToggle: "Space", stamp: "T", playbackEarlier: "ArrowLeft", playbackLater: "ArrowRight" }),
});

export function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return { ...DEFAULT_SETTINGS, ...saved, shortcuts: { ...DEFAULT_SETTINGS.shortcuts, ...(saved.shortcuts || {}) } };
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
  root.style.setProperty("--wave-color", settings.waveformColor);
}
