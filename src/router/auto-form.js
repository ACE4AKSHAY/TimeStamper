import { summarizeConsensus } from "../consensus-aligner.js";
import { detectForm } from "../forms/detect-form.js";
import { validateAlignmentResult } from "../contracts/index.js";
import { applyStructureAwareChecks } from "../structure-check.js";
import { buildEnginePlan } from "./rules.js";

/** Run a form-derived plan using the supplied legacy engine adapter. */
export function runAutoForm(request, runEngine) {
  const form = detectForm(request);
  const options = request.options || {};
  const plan = buildEnginePlan(form, options);
  const baseLines = Array.isArray(request.lines) ? request.lines : [];
  if (plan.refused) return refusalResult(baseLines, form, plan);

  const candidates = [];
  for (const entry of plan.entries) {
    if (entry.skipped) continue;
    checkAbort(options.signal);
    options.onProgress?.({
      stage: "engine",
      engine: entry.engine,
      fraction: candidates.length / Math.max(1, plan.entries.length),
    });
    const legacyRequest = toLegacyRequest(request, entry.engine);
    try {
      const result = runEngine(legacyRequest);
      if (result?.lines?.some((line) => Number.isFinite(line.startTime))) candidates.push({ entry, result });
    } catch (error) {
      candidates.push({ entry, error: String(error?.message || error) });
    }
  }
  if (!candidates.some((candidate) => candidate.result)) {
    return refusalResult(baseLines, form, { ...plan, reason: "all_planned_engines_failed" }, candidates);
  }
  const fused = fuseCandidates(baseLines, candidates, request.audio?.duration || 0, options);
  const structure = options.structureAware
    ? applyStructureAwareChecks(fused.lines, request.audio?.profiles?.energy, request.audio?.duration || 0, options)
    : { lines: fused.lines, diagnostics: { enabled: false } };
  const result = {
    engine: "auto-form",
    engineVersion: "0.1.0",
    lines: structure.lines,
    diagnostics: {
      form,
      plan,
      candidates: summarizeCandidates(candidates),
      fusion: fused.diagnostics,
      structure: structure.diagnostics,
    },
    timingsMs: { routing: 0, engines: 0, fusion: 0, total: 0 },
    parameters: { mode: options.mode || "auto", budgetMs: plan.budgetMs },
  };
  validateAlignmentResult(result);
  options.onProgress?.({ stage: "complete", fraction: 1 });
  return result;
}

function toLegacyRequest(request, engine) {
  const profiles = request.audio?.profiles || request.audio?.features || {};
  const parameters = {
    ...(request.parameters || {}),
    profiles,
    profile: profiles.energy,
    timedLyrics: request.timedLyrics,
    signal: request.options?.signal,
    onProgress: request.options?.onProgress,
  };
  if (request.reference) {
    Object.assign(parameters, request.reference.audio || {}, {
      referenceSamples: request.reference.audio?.samples,
      referenceSampleRate: request.reference.audio?.sampleRate,
      referenceStarts: request.reference.verifiedStarts,
      referenceDuration: request.reference.audio?.duration,
      targetSamples: request.audio?.samples,
      targetSampleRate: request.audio?.sampleRate,
      targetDuration: request.audio?.duration,
    });
  }
  return { lyrics: request.lines, duration: request.audio?.duration, engine, parameters };
}

function fuseCandidates(lines, candidates, duration, options) {
  const successful = candidates.filter((candidate) => candidate.result);
  const fusedLines = lines.map((line, index) => {
    const starts = successful.map((candidate) => candidate.result.lines[index]?.startTime).filter(Number.isFinite);
    const summary = summarizeConsensus(starts, { confidenceScale: options.confidenceScale || 0.5 });
    const sourceReviews = successful.flatMap((candidate) =>
      candidate.result.lines[index]?.reviewRequired ? [candidate.entry.engine] : [],
    );
    const reasons = [];
    if (summary.spread !== null && summary.spread > (options.maxDisagreementSeconds || 0.5))
      reasons.push("engines disagree on line start");
    if (sourceReviews.length) reasons.push(`source review flag: ${sourceReviews.join(", ")}`);
    if (!starts.length) reasons.push("no engine produced a timestamp");
    const sourceConfidence = successful
      .map((candidate) => candidate.result.lines[index]?.confidence)
      .filter(Number.isFinite);
    const confidence = starts.length
      ? summary.confidence * (sourceConfidence.length ? Math.max(...sourceConfidence) : 1)
      : 0;
    return {
      ...line,
      startTime: summary.startTime,
      endTime: null,
      confidence,
      reviewRequired: reasons.length > 0 || confidence < 0.65,
      reasons,
      alignmentMethod: "auto_form_consensus",
      alignmentReview: summary,
    };
  });
  fusedLines.forEach((line, index) => {
    line.endTime = fusedLines[index + 1]?.startTime ?? duration;
  });
  return {
    lines: fusedLines,
    diagnostics: {
      candidateCount: successful.length,
      disagreementThreshold: options.maxDisagreementSeconds || 0.5,
      reviewedLineCount: fusedLines.filter((line) => line.reviewRequired).length,
    },
  };
}

function summarizeCandidates(candidates) {
  return candidates.map(({ entry, result, error }) => ({
    engine: entry.engine,
    reason: entry.reason,
    estimatedMs: entry.estimatedMs,
    status: result ? "completed" : "failed",
    error: error || null,
    reviewRequired: Boolean(result?.reviewRequired),
  }));
}

function refusalResult(lines, form, plan, candidates = []) {
  const result = {
    engine: "auto-form",
    engineVersion: "0.1.0",
    lines: lines.map((line) => ({
      ...line,
      startTime: null,
      endTime: null,
      confidence: 0,
      reviewRequired: true,
      reasons: [plan.reason || "automatic alignment refused"],
      alignmentMethod: "auto_form_refused",
    })),
    diagnostics: { form, plan, candidates: summarizeCandidates(candidates), refused: true },
    timingsMs: { routing: 0, engines: 0, fusion: 0, total: 0 },
    parameters: { mode: "auto", budgetMs: plan.budgetMs ?? null },
  };
  validateAlignmentResult(result);
  return result;
}

function checkAbort(signal) {
  if (signal?.aborted) {
    const error = new Error("Form-aware alignment was aborted.");
    error.name = "AbortError";
    throw error;
  }
}
