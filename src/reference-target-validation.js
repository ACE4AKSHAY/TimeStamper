/**
 * Cheap checks that run before an expensive reference/target alignment.
 * Warnings do not reject a pair: covers, live recordings and remixes can
 * legitimately have different durations and still be useful experiments.
 */
export function validateReferenceTargetPair({ referenceDuration, targetDuration, referenceStarts, targetStarts, lineCount }) {
  const errors = [], warnings = [];
  if (!Number.isFinite(referenceDuration) || referenceDuration <= 0) errors.push("reference_duration_invalid");
  if (!Number.isFinite(targetDuration) || targetDuration <= 0) errors.push("target_duration_invalid");
  if (!Array.isArray(referenceStarts) || referenceStarts.length !== lineCount) errors.push("reference_line_count_mismatch");
  if (targetStarts != null && (!Array.isArray(targetStarts) || targetStarts.length !== lineCount)) errors.push("target_line_count_mismatch");
  for (const [name, values] of [["reference", referenceStarts], ["target", targetStarts]]) {
    if (!Array.isArray(values)) continue;
    if (values.some((value, index) => !Number.isFinite(Number(value)) || Number(value) < 0 || (index && Number(value) < Number(values[index - 1])))) errors.push(`${name}_timestamps_not_monotonic`);
  }
  if (!errors.length) {
    const ratio = targetDuration / referenceDuration;
    if (ratio < 0.75 || ratio > 1.25) warnings.push("large_duration_ratio");
    if (referenceStarts.at(-1) >= referenceDuration) warnings.push("reference_last_line_at_or_after_end");
    if (targetStarts?.length && targetStarts.at(-1) >= targetDuration) warnings.push("target_last_line_at_or_after_end");
    return { status: warnings.length ? "review" : "ready", errors, warnings, durationRatio: ratio, recommendedAnchorScale: warnings.includes("large_duration_ratio") ? "duration-ratio" : "none" };
  }
  return { status: "invalid", errors, warnings, durationRatio: Number.isFinite(referenceDuration) && referenceDuration > 0 && Number.isFinite(targetDuration) ? targetDuration / referenceDuration : null, recommendedAnchorScale: "none" };
}
