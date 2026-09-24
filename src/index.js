/**
 * Stable, platform-neutral public API for the reusable synchronization core.
 * Desktop UI code lives under src/ui/ and is intentionally not exported here.
 */
export { synchronize, ENGINE_VERSION } from "./engine.js";
export { createProject, createLine, createLyricsProvenance, normalizeText } from "./domain.js";
export { parseLyrics, linesToText } from "./lyrics.js";
export { exportLrc, lrcToSeconds, secondsToLrc } from "./lrc.js";
export { alignAutomatically, selectAutomaticRoute } from "./automatic-aligner.js";
