import { createEnergyInitialTimeline } from "./energy-aligner.js";

export const ENGINE_VERSION = "0.2.0";

/**
 * Platform-neutral synchronization entry point. Frontends provide normalized
 * lyric lines, audio duration and extracted features; no Electron/browser API
 * is required here, so this module can be reused by a future mobile client.
 */
export function synchronize({ lyrics, duration, energyProfile, engine = "energy-baseline", parameters = {} }) {
  const lines = Array.isArray(lyrics) ? lyrics : lyrics?.lines;
  if (!Array.isArray(lines) || !lines.length) throw new Error("Synchronization requires at least one lyric line.");
  if (engine !== "energy-baseline") throw new Error(`Unknown synchronization engine: ${engine}`);
  const alignedLines = createEnergyInitialTimeline(lines, energyProfile || [], duration);
  return {
    engine,
    engineVersion: ENGINE_VERSION,
    parameters: { ...parameters },
    lines: alignedLines,
    generatedAt: new Date().toISOString(),
  };
}
