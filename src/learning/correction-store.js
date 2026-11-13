const DEFAULT_LIMIT = 500;

export const CORRECTION_SCHEMA_VERSION = 1;

/**
 * Turn one user correction into a compact, privacy-preserving record. Audio
 * and lyric text are intentionally not stored; only the numeric error and
 * engine/form labels are needed to calibrate local routing.
 */
export function createCorrectionRecord({
  caseId = "local",
  lineId = "",
  engine = "unknown",
  predictedTime,
  correctedTime,
  form = "unknown",
  createdAt = new Date().toISOString(),
} = {}) {
  const predicted = finiteTime(predictedTime, "predictedTime");
  const corrected = finiteTime(correctedTime, "correctedTime");
  return {
    schemaVersion: CORRECTION_SCHEMA_VERSION,
    caseId: String(caseId),
    lineId: String(lineId),
    engine: String(engine || "unknown"),
    form: String(form || "unknown"),
    predictedTime: predicted,
    correctedTime: corrected,
    errorSeconds: Math.round((corrected - predicted) * 1e9) / 1e9,
    createdAt: String(createdAt),
  };
}

export function validateCorrectionRecord(value) {
  if (!value || value.schemaVersion !== CORRECTION_SCHEMA_VERSION)
    throw new Error("Correction record schemaVersion must be 1.");
  ["predictedTime", "correctedTime", "errorSeconds"].forEach((key) => finiteTime(value[key], key));
  if (!String(value.engine || "").trim()) throw new Error("Correction record engine is required.");
  return value;
}

export function summarizeCorrections(records = []) {
  const groups = new Map();
  for (const item of records) {
    const record = validateCorrectionRecord(item);
    const group = groups.get(record.engine) || {
      engine: record.engine,
      count: 0,
      signedErrorSum: 0,
      absoluteErrorSum: 0,
    };
    group.count += 1;
    group.signedErrorSum += record.errorSeconds;
    group.absoluteErrorSum += Math.abs(record.errorSeconds);
    groups.set(record.engine, group);
  }
  return [...groups.values()]
    .map((group) => ({
      engine: group.engine,
      count: group.count,
      meanSignedErrorSeconds: roundMetric(group.signedErrorSum / group.count),
      meanAbsoluteErrorSeconds: roundMetric(group.absoluteErrorSum / group.count),
    }))
    .sort((left, right) => left.engine.localeCompare(right.engine));
}

/**
 * Produce conservative offsets only after enough verified corrections exist.
 * The router can consume these hints explicitly; this function never changes
 * an alignment result by itself.
 */
export function deriveLearningHints(records = [], options = {}) {
  const minimumSamples = Number.isInteger(options.minimumSamples) ? Math.max(1, options.minimumSamples) : 5;
  const maxOffsetSeconds = Number.isFinite(options.maxOffsetSeconds) ? Math.max(0, options.maxOffsetSeconds) : 0.75;
  const summaries = summarizeCorrections(records);
  const engineOffsets = Object.fromEntries(
    summaries
      .filter((summary) => summary.count >= minimumSamples)
      .map((summary) => [
        summary.engine,
        Math.max(-maxOffsetSeconds, Math.min(maxOffsetSeconds, summary.meanSignedErrorSeconds)),
      ]),
  );
  return {
    schemaVersion: CORRECTION_SCHEMA_VERSION,
    minimumSamples,
    maxOffsetSeconds,
    engineOffsets,
    sourceCount: records.length,
    enabled: Object.keys(engineOffsets).length > 0,
  };
}

export function serializeCorrections(records = []) {
  return JSON.stringify(
    { schemaVersion: CORRECTION_SCHEMA_VERSION, records: records.map(validateCorrectionRecord) },
    null,
    2,
  );
}

export function deserializeCorrections(text) {
  const payload = JSON.parse(String(text));
  if (payload.schemaVersion !== CORRECTION_SCHEMA_VERSION || !Array.isArray(payload.records))
    throw new Error("Correction journal must contain schemaVersion 1 and a records array.");
  return payload.records.map(validateCorrectionRecord);
}

export function createCorrectionJournal({
  storage = null,
  key = "lyricsync.corrections.v1",
  limit = DEFAULT_LIMIT,
} = {}) {
  const max = Number.isInteger(limit) ? Math.max(1, limit) : DEFAULT_LIMIT;
  let records = readStorage(storage, key);
  return {
    records() {
      return records.map((record) => ({ ...record }));
    },
    append(input) {
      const record = validateCorrectionRecord(input?.schemaVersion ? input : createCorrectionRecord(input));
      records = [...records, record].slice(-max);
      writeStorage(storage, key, records);
      return { ...record };
    },
    summarize() {
      return summarizeCorrections(records);
    },
    hints(options) {
      return deriveLearningHints(records, options);
    },
    clear() {
      records = [];
      writeStorage(storage, key, records);
    },
  };
}

function finiteTime(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new Error(`${field} must be a finite non-negative number.`);
  return number;
}

function roundMetric(value) {
  return Math.round(value * 1e9) / 1e9;
}

function readStorage(storage, key) {
  if (!storage || typeof storage.getItem !== "function") return [];
  try {
    const text = storage.getItem(key);
    return text ? deserializeCorrections(text) : [];
  } catch {
    return [];
  }
}

function writeStorage(storage, key, records) {
  if (!storage || typeof storage.setItem !== "function") return;
  storage.setItem(key, serializeCorrections(records));
}
