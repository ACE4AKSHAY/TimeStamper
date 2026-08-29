export function scoreTimestamps(predicted, reference) {
  if (!Array.isArray(predicted) || !Array.isArray(reference) || predicted.length !== reference.length || !predicted.length) {
    throw new Error("Predicted and reference timestamp arrays must have the same non-zero length.");
  }
  const errors = predicted.map((value, index) => Math.abs(Number(value) - Number(reference[index])));
  if (errors.some((value) => !Number.isFinite(value))) throw new Error("Timestamps must be finite numbers.");
  const sorted = [...errors].sort((a, b) => a - b);
  const mean = errors.reduce((sum, value) => sum + value, 0) / errors.length;
  const median = sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
  return {
    count: errors.length,
    maeSeconds: mean,
    medianAbsoluteErrorSeconds: median,
    rmseSeconds: Math.sqrt(errors.reduce((sum, value) => sum + value ** 2, 0) / errors.length),
    within025: errors.filter((value) => value <= 0.25).length / errors.length,
    within050: errors.filter((value) => value <= 0.50).length / errors.length,
    within100: errors.filter((value) => value <= 1.00).length / errors.length,
    errorsSeconds: errors,
  };
}

export function formatMetricsMarkdown(result) {
  return [
    `# Energy baseline benchmark — ${result.datasetVersion}`,
    "",
    `Cases: ${result.caseCount} | Lines: ${result.metrics.count}`,
    "",
    "| Metric | Result |",
    "| --- | ---: |",
    `| Mean absolute error | ${result.metrics.maeSeconds.toFixed(3)} s |`,
    `| Median absolute error | ${result.metrics.medianAbsoluteErrorSeconds.toFixed(3)} s |`,
    `| RMSE | ${result.metrics.rmseSeconds.toFixed(3)} s |`,
    `| Within 0.25 s | ${(result.metrics.within025 * 100).toFixed(1)}% |`,
    `| Within 0.50 s | ${(result.metrics.within050 * 100).toFixed(1)}% |`,
    `| Within 1.00 s | ${(result.metrics.within100 * 100).toFixed(1)}% |`,
    "",
    `Runtime: ${result.runtimeMs.toFixed(2)} ms | Peak heap observed: ${(result.peakHeapBytes / 1024 / 1024).toFixed(2)} MB`,
    "",
    "This baseline distributes supplied lyric lines using audio energy. It is not speech recognition and should not be treated as ground truth.",
    "",
  ].join("\n");
}

/**
 * Summarize whether an aligner's bounded confidence is useful for triage.
 * This is calibration evidence, not a probability estimate.
 */
export function summarizeConfidence(predicted, reference, confidences, options = {}) {
  if (!Array.isArray(predicted) || !Array.isArray(reference) || !Array.isArray(confidences) || predicted.length !== reference.length || predicted.length !== confidences.length || !predicted.length) throw new Error("Confidence summaries require equal non-empty prediction, reference and confidence arrays.");
  const thresholds = { high: Number.isFinite(options.highThreshold) ? options.highThreshold : 0.75, medium: Number.isFinite(options.mediumThreshold) ? options.mediumThreshold : 0.5 };
  if (!(thresholds.high > thresholds.medium) || thresholds.medium < 0 || thresholds.high > 1) throw new Error("Confidence thresholds must satisfy 0 <= medium < high <= 1.");
  const buckets = { high: [], medium: [], low: [] };
  for (let index = 0; index < confidences.length; index++) {
    const confidence = Number(confidences[index]);
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) throw new Error("Confidence values must be finite numbers between 0 and 1.");
    const bucket = confidence >= thresholds.high ? "high" : confidence >= thresholds.medium ? "medium" : "low";
    buckets[bucket].push(Math.abs(Number(predicted[index]) - Number(reference[index])));
  }
  return { thresholds, buckets: Object.fromEntries(Object.entries(buckets).map(([name, errors]) => [name, { count: errors.length, maeSeconds: errors.length ? errors.reduce((sum, value) => sum + value, 0) / errors.length : null, within100: errors.length ? errors.filter((value) => value <= 1).length / errors.length : null }])), ordering: buckets.high.length && buckets.low.length ? { highMaeNotWorseThanLow: mean(buckets.high) <= mean(buckets.low) } : null };
}

function mean(values) { return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length); }
