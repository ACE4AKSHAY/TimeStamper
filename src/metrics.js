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
