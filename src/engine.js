import { createEnergyInitialTimeline } from "./energy-aligner.js";
import { alignLineTemplates } from "./template-aligner.js";

export const ENGINE_VERSION = "0.2.0";

/**
 * Platform-neutral synchronization entry point. Frontends provide normalized
 * lyric lines, audio duration and extracted features; no Electron/browser API
 * is required here, so this module can be reused by a future mobile client.
 */
export function synchronize({ lyrics, duration, energyProfile, engine = "energy-baseline", parameters = {} }) {
  const lines = Array.isArray(lyrics) ? lyrics : lyrics?.lines;
  if (!Array.isArray(lines) || !lines.length) throw new Error("Synchronization requires at least one lyric line.");
  if (engine === "template-mfcc-dtw") {
    const alignment = alignLineTemplates(parameters.audioFrames, parameters.lineTemplates, parameters);
    const alignedLines = lines.map((line, index) => ({ ...line, startTime: alignment.segments[index].startTime, endTime: alignment.segments[index].endTime, alignmentMethod: alignment.method, confidence: null }));
    return { engine, engineVersion: ENGINE_VERSION, parameters: { ...parameters, audioFrames: undefined, lineTemplates: undefined }, lines: alignedLines, alignment, generatedAt: new Date().toISOString() };
  }
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
