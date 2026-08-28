export const DEFAULT_EVALUATION_ENGINES = ["adaptive-boundary-dp", "text-weighted-boundary-dp", "refined-boundary-dp", "vocal-gated-boundary-dp", "adaptive-vocal-boundary-dp", "ensemble-boundary"];

/** Read one of the supported reference timestamp document shapes. */
export function extractReferenceStarts(document) {
  const values = document?.startTimes || document?.lineStarts || document?.timestamps || (Array.isArray(document?.lines) ? document.lines.map((line) => line?.startTime) : null);
  if (!Array.isArray(values) || !values.length) throw new Error("reference.json must contain a non-empty startTimes, lineStarts, timestamps, or lines array.");
  const starts = values.map(Number);
  if (starts.some((value, index) => !Number.isFinite(value) || value < 0 || (index && value < starts[index - 1]))) throw new Error("Reference timestamps must be finite, non-negative, and monotonic.");
  return starts;
}

export function buildEvaluationParameters(engine, profiles, voicedness) {
  const parameters = {};
  if (["vocal-gated-boundary-dp", "adaptive-vocal-boundary-dp"].includes(engine)) parameters.profiles = { ...profiles, voicedness };
  else if (engine === "multi-profile-boundary-dp") parameters.profiles = { ...profiles, voicedness };
  else parameters.profile = profiles.energy;
  return parameters;
}
