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
import { alignWithReferenceTemplates } from "./reference-template-aligner.js";
import { alignWithReferenceTemplateEnsemble } from "./reference-template-ensemble.js";
import { alignAutomatically } from "./automatic-aligner.js";

export const ENGINE_VERSION = "0.3.0";

/**
 * Platform-neutral synchronization entry point. Frontends provide normalized
 * lyric lines, audio duration and extracted features; no Electron/browser API
 * is required here, so this module can be reused by a future mobile client.
 */
function synchronizeLegacy({ lyrics, duration, energyProfile, engine = "energy-baseline", parameters = {} }) {
  const lines = Array.isArray(lyrics) ? lyrics : lyrics?.lines;
  if (!Array.isArray(lines) || !lines.length) throw new Error("Synchronization requires at least one lyric line.");
  if (engine === "combined-profile") {
    const alignment = createCombinedInitialTimeline(
      lines,
      parameters.profiles || { energy: energyProfile || [] },
      duration,
      parameters,
    );
    return {
      engine,
      engineVersion: ENGINE_VERSION,
      parameters: alignment.parameters,
      profileFusion: alignment.fusion,
      lines: alignment.lines,
      generatedAt: new Date().toISOString(),
    };
  }
  if (engine === "automatic") {
    const alignment = alignAutomatically(
      lines,
      parameters.profiles || { energy: energyProfile || [] },
      duration,
      parameters,
    );
    return {
      engine,
      engineVersion: ENGINE_VERSION,
      selectedEngine: alignment.selectedEngine,
      selection: alignment.selection,
      parameters: { ...parameters, profiles: undefined },
      lines: alignment.lines,
      alignment,
      generatedAt: new Date().toISOString(),
    };
  }
  if (engine === "boundary-dp") {
    const alignment = alignByBoundaryDp(lines, parameters.profile || energyProfile || [], duration, parameters);
    const alignedLines = lines.map((line, index) => ({
      ...line,
      startTime: alignment.segments[index].startTime,
      endTime: alignment.segments[index].endTime,
      alignmentMethod: alignment.method,
      confidence: null,
    }));
    return {
      engine,
      engineVersion: ENGINE_VERSION,
      parameters: { ...parameters, profile: undefined },
      lines: alignedLines,
      alignment,
      generatedAt: new Date().toISOString(),
    };
  }
  if (engine === "intro-aware-boundary-dp") {
    const alignment = alignByIntroAwareBoundaryDp(
      lines,
      parameters.profile || energyProfile || [],
      duration,
      parameters,
    );
    const alignedLines = lines.map((line, index) => ({
      ...line,
      startTime: alignment.segments[index].startTime,
      endTime: alignment.segments[index].endTime,
      alignmentMethod: alignment.method,
      confidence: null,
    }));
    return {
      engine,
      engineVersion: ENGINE_VERSION,
      parameters: { ...parameters, profile: undefined },
      alignment,
      lines: alignedLines,
      generatedAt: new Date().toISOString(),
    };
  }
  if (engine === "adaptive-boundary-dp") {
    const alignment = alignByAdaptiveBoundaryDp(lines, parameters.profile || energyProfile || [], duration, parameters);
    const alignedLines = lines.map((line, index) => ({
      ...line,
      startTime: alignment.segments[index].startTime,
      endTime: alignment.segments[index].endTime,
      alignmentMethod: alignment.method,
      confidence: null,
    }));
    return {
      engine,
      engineVersion: ENGINE_VERSION,
      parameters: { ...parameters, profile: undefined },
      alignment,
      lines: alignedLines,
      generatedAt: new Date().toISOString(),
    };
  }
  if (engine === "text-weighted-boundary-dp") {
    const alignment = alignByTextWeightedBoundaryDp(
      lines,
      parameters.profile || energyProfile || [],
      duration,
      parameters,
    );
    const alignedLines = lines.map((line, index) => ({
      ...line,
      startTime: alignment.segments[index].startTime,
      endTime: alignment.segments[index].endTime,
      alignmentMethod: alignment.method,
      confidence: null,
    }));
    return {
      engine,
      engineVersion: ENGINE_VERSION,
      parameters: { ...parameters, profile: undefined },
      alignment,
      lines: alignedLines,
      generatedAt: new Date().toISOString(),
    };
  }
  if (engine === "refined-boundary-dp") {
    const profile = parameters.profile || energyProfile || [];
    const coarse = alignByAdaptiveBoundaryDp(lines, profile, duration, parameters);
    const refinement = refineBoundarySegments(coarse.segments, profile, duration, parameters);
    const alignedLines = lines.map((line, index) => ({
      ...line,
      startTime: refinement.segments[index].startTime,
      endTime: refinement.segments[index].endTime,
      alignmentMethod: refinement.method,
      confidence: refinement.segments[index].refinement?.confidence ?? null,
    }));
    return {
      engine,
      engineVersion: ENGINE_VERSION,
      parameters: { ...parameters, profile: undefined },
      coarseAlignment: coarse,
      alignment: refinement,
      lines: alignedLines,
      generatedAt: new Date().toISOString(),
    };
  }
  if (engine === "ensemble-boundary") {
    const alignment = alignByEnsemble(lines, parameters.profile || energyProfile || [], duration, parameters);
    return {
      engine,
      engineVersion: ENGINE_VERSION,
      parameters: { ...parameters, profile: undefined },
      alignment,
      lines: alignment.lines,
      generatedAt: new Date().toISOString(),
    };
  }
  if (engine === "vocal-gated-boundary-dp") {
    const alignment = alignByVocalGatedBoundaryDp(lines, parameters.profiles || {}, duration, parameters);
    const alignedLines = lines.map((line, index) => ({
      ...line,
      startTime: alignment.segments[index].startTime,
      endTime: alignment.segments[index].endTime,
      alignmentMethod: alignment.method,
      confidence: null,
    }));
    return {
      engine,
      engineVersion: ENGINE_VERSION,
      parameters: { ...parameters, profiles: undefined },
      alignment,
      lines: alignedLines,
      generatedAt: new Date().toISOString(),
    };
  }
  if (engine === "adaptive-vocal-boundary-dp") {
    const alignment = alignByAdaptiveVocalBoundaryDp(lines, parameters.profiles || {}, duration, parameters);
    const alignedLines = lines.map((line, index) => ({
      ...line,
      startTime: alignment.segments[index].startTime,
      endTime: alignment.segments[index].endTime,
      alignmentMethod: alignment.method,
      confidence: null,
    }));
    return {
      engine,
      engineVersion: ENGINE_VERSION,
      parameters: { ...parameters, profiles: undefined },
      alignment,
      lines: alignedLines,
      generatedAt: new Date().toISOString(),
    };
  }
  if (engine === "silence-aware-boundary-dp") {
    const alignment = alignBySilenceAwareBoundaryDp(
      lines,
      parameters.profile || energyProfile || [],
      duration,
      parameters,
    );
    const alignedLines = lines.map((line, index) => ({
      ...line,
      startTime: alignment.segments[index].startTime,
      endTime: alignment.segments[index].endTime,
      alignmentMethod: alignment.method,
      confidence: null,
    }));
    return {
      engine,
      engineVersion: ENGINE_VERSION,
      parameters: { ...parameters, profile: undefined },
      alignment,
      lines: alignedLines,
      generatedAt: new Date().toISOString(),
    };
  }
  if (engine === "multi-profile-boundary-dp") {
    const alignment = alignMultiProfile(
      lines,
      parameters.profiles || { energy: energyProfile || [] },
      duration,
      parameters,
    );
    return {
      engine,
      engineVersion: ENGINE_VERSION,
      parameters: { weights: alignment.fusion.components },
      profileFusion: alignment.fusion,
      alignment: alignment.alignment,
      lines: alignment.lines,
      generatedAt: new Date().toISOString(),
    };
  }
  if (engine === "template-mfcc-dtw") {
    const alignment = alignLineTemplates(parameters.audioFrames, parameters.lineTemplates, parameters);
    const alignedLines = lines.map((line, index) => ({
      ...line,
      startTime: alignment.segments[index].startTime,
      endTime: alignment.segments[index].endTime,
      alignmentMethod: alignment.method,
      confidence: alignment.segments[index].confidence,
      reviewRequired: alignment.segments[index].reviewRequired,
    }));
    return {
      engine,
      engineVersion: ENGINE_VERSION,
      parameters: { ...parameters, audioFrames: undefined, lineTemplates: undefined },
      lines: alignedLines,
      alignment,
      generatedAt: new Date().toISOString(),
    };
  }
  if (engine === "reference-template-mfcc-dtw") {
    const alignment = alignWithReferenceTemplates({
      referenceSamples: parameters.referenceSamples,
      referenceSampleRate: parameters.referenceSampleRate,
      referenceStarts: parameters.referenceStarts,
      referenceDuration: parameters.referenceDuration,
      targetSamples: parameters.targetSamples,
      targetSampleRate: parameters.targetSampleRate,
      targetDuration: parameters.targetDuration ?? duration,
      lyrics: lines,
      options: { ...(parameters.options || parameters), signal: parameters.signal, onProgress: parameters.onProgress },
    });
    const alignedLines = alignment.lines.map((line) => ({ ...line }));
    return {
      engine,
      engineVersion: ENGINE_VERSION,
      parameters: {
        ...alignment.parameters,
        referenceSamples: undefined,
        targetSamples: undefined,
        referenceStarts: undefined,
        options: undefined,
      },
      lines: alignedLines,
      alignment,
      reference: alignment.reference,
      target: alignment.target,
      generatedAt: new Date().toISOString(),
    };
  }
  if (engine === "reference-template-ensemble") {
    const alignment = alignWithReferenceTemplateEnsemble({
      variants: parameters.variants,
      lyrics: lines,
      duration: parameters.targetDuration ?? duration,
      referenceSamples: parameters.referenceSamples,
      referenceSampleRate: parameters.referenceSampleRate,
      referenceStarts: parameters.referenceStarts,
      referenceDuration: parameters.referenceDuration,
      targetSamples: parameters.targetSamples,
      targetSampleRate: parameters.targetSampleRate,
      targetDuration: parameters.targetDuration ?? duration,
      ensembleOptions: parameters.ensembleOptions,
      signal: parameters.signal,
      onProgress: parameters.onProgress,
    });
    return {
      engine,
      engineVersion: ENGINE_VERSION,
      parameters: {
        variants: parameters.variants,
        ensembleOptions: parameters.ensembleOptions || {},
        referenceSamples: undefined,
        targetSamples: undefined,
        referenceStarts: undefined,
      },
      lines: alignment.lines,
      alignment,
      generatedAt: new Date().toISOString(),
    };
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

const ENGINE_DEFINITIONS = [
  ["energy-baseline", "recommended", ["duration", "energyProfile"], "low"],
  ["combined-profile", "recommended", ["duration", "profiles"], "low"],
  ["automatic", "recommended", ["duration", "profiles"], "medium"],
  ["boundary-dp", "recommended", ["duration", "profile"], "low"],
  ["intro-aware-boundary-dp", "experimental", ["duration", "profile"], "medium"],
  ["adaptive-boundary-dp", "recommended", ["duration", "profile"], "medium"],
  ["text-weighted-boundary-dp", "recommended", ["duration", "profile"], "medium"],
  ["refined-boundary-dp", "recommended", ["duration", "profile"], "medium"],
  ["ensemble-boundary", "experimental", ["duration", "profile"], "high"],
  ["vocal-gated-boundary-dp", "recommended", ["duration", "profiles.voicedness"], "medium"],
  ["adaptive-vocal-boundary-dp", "recommended", ["duration", "profiles.voicedness"], "medium"],
  ["silence-aware-boundary-dp", "recommended", ["duration", "profile"], "medium"],
  ["multi-profile-boundary-dp", "recommended", ["duration", "profiles"], "medium"],
  ["template-mfcc-dtw", "experimental", ["audioFrames", "lineTemplates"], "high"],
  ["reference-template-mfcc-dtw", "experimental", ["reference", "target"], "high"],
  ["reference-template-ensemble", "experimental", ["reference", "target", "variants"], "very-high"],
];

function createEngineDescriptor([name, maturity, requires, cost]) {
  return Object.freeze({
    name,
    maturity,
    requires: Object.freeze([...requires]),
    cost,
    run(request) {
      return synchronizeLegacy({ ...request, engine: name });
    },
    describe() {
      return { name, maturity, requires: [...requires], cost };
    },
  });
}

/**
 * Registry of every public engine. The run adapters deliberately preserve the
 * historical engine result shape while giving the router and UI a single
 * inspectable source of truth.
 */
export const ENGINE_REGISTRY = Object.freeze(
  Object.fromEntries(ENGINE_DEFINITIONS.map((definition) => [definition[0], createEngineDescriptor(definition)])),
);

export function listEngines() {
  return Object.values(ENGINE_REGISTRY).map((descriptor) => descriptor.describe());
}

/**
 * Stable synchronization facade. Existing callers continue to pass the
 * legacy request shape; registry dispatch is transparent to them.
 */
export function synchronize(request = {}) {
  const engine = request.engine || "energy-baseline";
  const descriptor = ENGINE_REGISTRY[engine];
  if (!descriptor) throw new Error(`Unknown synchronization engine: ${engine}`);
  return descriptor.run(request);
}
