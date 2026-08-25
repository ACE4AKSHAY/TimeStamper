const STORAGE_KEY = "lyricsync.general-settings.v1";

export const DEFAULT_SETTINGS = Object.freeze({
  theme: "midnight",
  waveformColor: "#4ca2f7",
  textScale: "medium",
});

export function loadSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
  } catch {
    return { ...DEFAULT_SETTINGS };
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
