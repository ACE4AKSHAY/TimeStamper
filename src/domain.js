export const APP_VERSION = "0.1.0";

export function createLine(text, index) {
  return {
    id: crypto.randomUUID(),
    originalText: text,
    normalizedText: normalizeText(text),
    startTime: null,
    endTime: null,
    confidence: null,
    source: "imported",
    alignmentMethod: "manual",
    manuallyCorrected: false,
    order: index,
  };
}

export function normalizeText(text) {
  return String(text).normalize("NFC").replace(/\s+/gu, " ").trim();
}

export function createProject() {
  return {
    schemaVersion: 1,
    appVersion: APP_VERSION,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: { title: "Untitled project", artist: "", album: "", language: "" },
    audio: { name: "", type: "", duration: null, sourceHint: "" },
    lyrics: { source: "manual", lines: [] },
    timeline: { lines: [] },
  };
}

export function isProject(value) {
  return Boolean(value && value.schemaVersion === 1 && value.metadata && Array.isArray(value.timeline?.lines));
}
