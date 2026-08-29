/**
 * Combine line-start candidates from independent engines using a median.
 * Agreement spread is exposed as an uncertainty signal; it is not a learned
 * confidence model and must not be treated as proof of correctness.
 */
export function summarizeConsensus(candidates, options = {}) {
  const values = Array.from(candidates || [], Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (!values.length) return { startTime: null, medianAbsoluteDeviation: null, spread: null, confidence: 0, candidateCount: 0 };
  const median = values.length % 2 ? values[(values.length - 1) / 2] : (values[values.length / 2 - 1] + values[values.length / 2]) / 2;
  const deviations = values.map((value) => Math.abs(value - median)).sort((a, b) => a - b);
  const mad = deviations.length % 2 ? deviations[(deviations.length - 1) / 2] : (deviations[deviations.length / 2 - 1] + deviations[deviations.length / 2]) / 2;
  const spread = values[values.length - 1] - values[0];
  const scale = Number.isFinite(options.confidenceScale) && options.confidenceScale > 0 ? options.confidenceScale : 1;
  return { startTime: median, medianAbsoluteDeviation: mad, spread, confidence: Math.max(0, Math.min(1, 1 - mad / scale)), candidateCount: values.length };
}

/**
 * Consensus variant that lets an explainable bounded confidence value affect
 * influence. It is opt-in because confidence is a triage signal, not a
 * calibrated probability.
 */
export function summarizeWeightedConsensus(candidates, weights, options = {}) {
  const pairs = Array.from(candidates || [], Number).map((value, index) => ({ value, weight: Math.max(0, Number(weights?.[index]) || 0) })).filter((pair) => Number.isFinite(pair.value) && pair.weight > 0).sort((left, right) => left.value - right.value);
  if (!pairs.length) return summarizeConsensus(candidates, options);
  const totalWeight = pairs.reduce((sum, pair) => sum + pair.weight, 0);
  const median = weightedQuantile(pairs, totalWeight / 2);
  const deviations = pairs.map((pair) => ({ value: Math.abs(pair.value - median), weight: pair.weight })).sort((left, right) => left.value - right.value);
  const mad = weightedQuantile(deviations, totalWeight / 2);
  const spread = pairs[pairs.length - 1].value - pairs[0].value;
  const scale = Number.isFinite(options.confidenceScale) && options.confidenceScale > 0 ? options.confidenceScale : 1;
  return { startTime: median, medianAbsoluteDeviation: mad, spread, confidence: Math.max(0, Math.min(1, 1 - mad / scale)), candidateCount: pairs.length, totalWeight };
}

/**
 * Select the highest-weight group of nearby candidates before taking its
 * weighted median. This prevents a multimodal set of starts from producing a
 * timestamp between two competing acoustic hypotheses.
 */
export function summarizeClusteredConsensus(candidates, weights, options = {}) {
  const tolerance = Number.isFinite(options.clusterToleranceSeconds) && options.clusterToleranceSeconds > 0 ? options.clusterToleranceSeconds : 0;
  if (!tolerance) return summarizeWeightedConsensus(candidates, weights, options);
  const pairs = Array.from(candidates || [], Number).map((value, index) => ({ value, weight: Math.max(0, Number(weights?.[index]) || 0) })).filter((pair) => Number.isFinite(pair.value) && pair.weight > 0).sort((left, right) => left.value - right.value);
  if (!pairs.length) return summarizeWeightedConsensus(candidates, weights, options);
  const clusters = [];
  for (const pair of pairs) {
    const current = clusters[clusters.length - 1];
    if (!current || pair.value - current[current.length - 1].value > tolerance) clusters.push([pair]);
    else current.push(pair);
  }
  const selected = clusters.reduce((best, cluster) => {
    const weight = cluster.reduce((sum, pair) => sum + pair.weight, 0);
    const bestWeight = best ? best.reduce((sum, pair) => sum + pair.weight, 0) : -1;
    return weight > bestWeight ? cluster : best;
  }, null);
  const summary = summarizeWeightedConsensus(selected.map((pair) => pair.value), selected.map((pair) => pair.weight), options);
  return { ...summary, clusterCount: clusters.length, selectedClusterWeight: selected.reduce((sum, pair) => sum + pair.weight, 0), totalCandidateCount: pairs.length, outlierCount: pairs.length - selected.length, clusterToleranceSeconds: tolerance };
}

function weightedQuantile(pairs, targetWeight) {
  let cumulative = 0;
  for (const pair of pairs) {
    cumulative += pair.weight;
    if (cumulative >= targetWeight) return pair.value;
  }
  return pairs[pairs.length - 1].value;
}

export function buildConsensusTimeline(lines, candidateTimelines, options = {}) {
  if (!Array.isArray(lines) || !Array.isArray(candidateTimelines) || !candidateTimelines.length) throw new Error("Consensus requires lines and at least one candidate timeline.");
  return lines.map((line, index) => {
    const summary = summarizeConsensus(candidateTimelines.map((timeline) => timeline?.[index]), options);
    return { ...line, startTime: summary.startTime, confidence: summary.confidence, consensus: summary };
  });
}
