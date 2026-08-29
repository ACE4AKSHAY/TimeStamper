import { createEnergyInitialTimeline } from "./energy-aligner.js";
import { alignLineTemplates } from "./template-aligner.js";
import { createCombinedInitialTimeline } from "./combined-aligner.js";
import { alignByBoundaryDp } from "./boundary-dp-aligner.js";
import { alignMultiProfile } from "./multi-profile-aligner.js";
import { alignByIntroAwareBoundaryDp } from "./intro-aware-aligner.js";
import { alignByAdaptiveBoundaryDp } from "./adaptive-boundary-aligner.js";
import { alignByTextWeightedBoundaryDp } from "./text-weighted-aligner.js";
import { refineBoundarySegments } from "./boundary-refiner.js";
import { alignByEnsemble } from "./ensemble-aligner.js";
import { alignByVocalGatedBoundaryDp } from "./vocal-gated-aligner.js";
import { alignByAdaptiveVocalBoundaryDp } from "./adaptive-vocal-aligner.js";
import { alignBySilenceAwareBoundaryDp } from "./silence-aware-aligner.js";

export const ENGINE_VERSION = "0.3.0";

/**
 * Platform-neutral synchronization entry point. Frontends provide normalized
 * lyric lines, audio duration and extracted features; no Electron/browser API
 * is required here, so this module can be reused by a future mobile client.
 */
export function synchronize({ lyrics, duration, energyProfile, engine = "energy-baseline", parameters = {} }) {
  const lines = Array.isArray(lyrics) ? lyrics : lyrics?.lines;
  if (!Array.isArray(lines) || !lines.length) throw new Error("Synchronization requires at least one lyric line.");
  if (engine === "combined-profile") {
    const alignment = createCombinedInitialTimeline(lines, parameters.profiles || { energy: energyProfile || [] }, duration, parameters);
    return { engine, engineVersion: ENGINE_VERSION, parameters: alignment.parameters, profileFusion: alignment.fusion, lines: alignment.lines, generatedAt: new Date().toISOString() };
  }
  if (engine === "boundary-dp") {
    const alignment = alignByBoundaryDp(lines, parameters.profile || energyProfile || [], duration, parameters);
    const alignedLines = lines.map((line, index) => ({ ...line, startTime: alignment.segments[index].startTime, endTime: alignment.segments[index].endTime, alignmentMethod: alignment.method, confidence: null }));
    return { engine, engineVersion: ENGINE_VERSION, parameters: { ...parameters, profile: undefined }, lines: alignedLines, alignment, generatedAt: new Date().toISOString() };
  }
  if (engine === "intro-aware-boundary-dp") {
    const alignment = alignByIntroAwareBoundaryDp(lines, parameters.profile || energyProfile || [], duration, parameters);
    const alignedLines = lines.map((line, index) => ({ ...line, startTime: alignment.segments[index].startTime, endTime: alignment.segments[index].endTime, alignmentMethod: alignment.method, confidence: null }));
    return { engine, engineVersion: ENGINE_VERSION, parameters: { ...parameters, profile: undefined }, alignment, lines: alignedLines, generatedAt: new Date().toISOString() };
  }
  if (engine === "adaptive-boundary-dp") {
    const alignment = alignByAdaptiveBoundaryDp(lines, parameters.profile || energyProfile || [], duration, parameters);
    const alignedLines = lines.map((line, index) => ({ ...line, startTime: alignment.segments[index].startTime, endTime: alignment.segments[index].endTime, alignmentMethod: alignment.method, confidence: null }));
    return { engine, engineVersion: ENGINE_VERSION, parameters: { ...parameters, profile: undefined }, alignment, lines: alignedLines, generatedAt: new Date().toISOString() };
  }
  if (engine === "text-weighted-boundary-dp") {
    const alignment = alignByTextWeightedBoundaryDp(lines, parameters.profile || energyProfile || [], duration, parameters);
    const alignedLines = lines.map((line, index) => ({ ...line, startTime: alignment.segments[index].startTime, endTime: alignment.segments[index].endTime, alignmentMethod: alignment.method, confidence: null }));
    return { engine, engineVersion: ENGINE_VERSION, parameters: { ...parameters, profile: undefined }, alignment, lines: alignedLines, generatedAt: new Date().toISOString() };
  }
  if (engine === "refined-boundary-dp") {
    const profile = parameters.profile || energyProfile || [];
    const coarse = alignByAdaptiveBoundaryDp(lines, profile, duration, parameters);
    const refinement = refineBoundarySegments(coarse.segments, profile, duration, parameters);
    const alignedLines = lines.map((line, index) => ({ ...line, startTime: refinement.segments[index].startTime, endTime: refinement.segments[index].endTime, alignmentMethod: refinement.method, confidence: refinement.segments[index].refinement?.confidence ?? null }));
    return { engine, engineVersion: ENGINE_VERSION, parameters: { ...parameters, profile: undefined }, coarseAlignment: coarse, alignment: refinement, lines: alignedLines, generatedAt: new Date().toISOString() };
  }
  if (engine === "ensemble-boundary") {
    const alignment = alignByEnsemble(lines, parameters.profile || energyProfile || [], duration, parameters);
    return { engine, engineVersion: ENGINE_VERSION, parameters: { ...parameters, profile: undefined }, alignment, lines: alignment.lines, generatedAt: new Date().toISOString() };
  }
  if (engine === "vocal-gated-boundary-dp") {
    const alignment = alignByVocalGatedBoundaryDp(lines, parameters.profiles || {}, duration, parameters);
    const alignedLines = lines.map((line, index) => ({ ...line, startTime: alignment.segments[index].startTime, endTime: alignment.segments[index].endTime, alignmentMethod: alignment.method, confidence: null }));
    return { engine, engineVersion: ENGINE_VERSION, parameters: { ...parameters, profiles: undefined }, alignment, lines: alignedLines, generatedAt: new Date().toISOString() };
  }
  if (engine === "adaptive-vocal-boundary-dp") {
    const alignment = alignByAdaptiveVocalBoundaryDp(lines, parameters.profiles || {}, duration, parameters);
    const alignedLines = lines.map((line, index) => ({ ...line, startTime: alignment.segments[index].startTime, endTime: alignment.segments[index].endTime, alignmentMethod: alignment.method, confidence: null }));
    return { engine, engineVersion: ENGINE_VERSION, parameters: { ...parameters, profiles: undefined }, alignment, lines: alignedLines, generatedAt: new Date().toISOString() };
  }
  if (engine === "silence-aware-boundary-dp") {
    const alignment = alignBySilenceAwareBoundaryDp(lines, parameters.profile || energyProfile || [], duration, parameters);
    const alignedLines = lines.map((line, index) => ({ ...line, startTime: alignment.segments[index].startTime, endTime: alignment.segments[index].endTime, alignmentMethod: alignment.method, confidence: null }));
    return { engine, engineVersion: ENGINE_VERSION, parameters: { ...parameters, profile: undefined }, alignment, lines: alignedLines, generatedAt: new Date().toISOString() };
  }
  if (engine === "multi-profile-boundary-dp") {
    const alignment = alignMultiProfile(lines, parameters.profiles || { energy: energyProfile || [] }, duration, parameters);
    return { engine, engineVersion: ENGINE_VERSION, parameters: { weights: alignment.fusion.components }, profileFusion: alignment.fusion, alignment: alignment.alignment, lines: alignment.lines, generatedAt: new Date().toISOString() };
  }
  if (engine === "template-mfcc-dtw") {
    const alignment = alignLineTemplates(parameters.audioFrames, parameters.lineTemplates, parameters);
    const alignedLines = lines.map((line, index) => ({ ...line, startTime: alignment.segments[index].startTime, endTime: alignment.segments[index].endTime, alignmentMethod: alignment.method, confidence: alignment.segments[index].confidence, reviewRequired: alignment.segments[index].reviewRequired }));
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
