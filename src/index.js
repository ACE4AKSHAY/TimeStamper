/**
 * Stable, platform-neutral public API for the reusable synchronization core.
 * Desktop UI code lives under src/ui/ and is intentionally not exported here.
 */
export { synchronize, ENGINE_VERSION, ENGINE_REGISTRY, listEngines } from "./engine.js";
export { createProject, createLine, createLyricsProvenance, normalizeText } from "./domain.js";
export { parseLyrics, linesToText } from "./lyrics.js";
export { exportLrc, lrcToSeconds, secondsToLrc } from "./lrc.js";
export { alignAutomatically, selectAutomaticRoute } from "./automatic-aligner.js";
export { validateAlignmentRequest, validateAlignmentResult, validateFormDescriptor } from "./contracts/index.js";
export { detectForm, detectLineScript } from "./forms/index.js";
export { retimeLrc, RETIME_LRC_VERSION } from "./retime-lrc.js";
export { buildEnginePlan, runAutoForm } from "./router/index.js";
export { addWordTimings, interpolateWordTimings, tokenizeWords } from "./word-timing.js";
export { exportEnhancedLrc } from "./enhanced-lrc.js";
export { applyStructureAwareChecks } from "./structure-check.js";
