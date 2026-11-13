/**
 * @typedef {Object} TimedWord
 * @property {string} text
 * @property {number|null} [startTime]
 * @property {number|null} [endTime]
 */

/**
 * @typedef {Object} TimedLine
 * @property {string} text
 * @property {number|null} startTime
 * @property {number|null} endTime
 * @property {TimedWord[]} [words]
 */

/**
 * @typedef {Object} NormalizedTimedLyrics
 * @property {TimedLine[]} timedLines
 * @property {TimedWord[]} timedWords
 */

/**
 * @typedef {Object} AlignmentLine
 * @property {string} id
 * @property {string} text
 * @property {number|null} [startTime]
 * @property {number|null} [endTime]
 * @property {TimedWord[]} [words]
 */

/**
 * @typedef {Object} AudioDescriptor
 * @property {number} duration
 * @property {number} [sampleRate]
 * @property {Object<string, unknown>} [profiles]
 * @property {Object<string, unknown>} [features]
 * @property {function(string): unknown} [getProfile]
 * @property {function(string): unknown} [getFeature]
 * @property {function(string): Promise<unknown>|unknown} [getProfileAsync]
 * @property {function(string): Promise<unknown>|unknown} [getFeatureAsync]
 */

/**
 * @typedef {Object} AlignmentReference
 * @property {AudioDescriptor} audio
 * @property {number[]} verifiedStarts
 */

/**
 * @typedef {Object} AlignmentOptions
 * @property {string} mode
 * @property {number} [budgetMs]
 * @property {AbortSignal} [signal]
 * @property {function(Object): void} [onProgress]
 * @property {Object[]} [plugins]
 */

/**
 * @typedef {Object} AlignmentRequest
 * @property {AlignmentLine[]} lines
 * @property {AudioDescriptor} audio
 * @property {NormalizedTimedLyrics} [timedLyrics]
 * @property {AlignmentReference} [reference]
 * @property {AlignmentOptions} options
 */

/**
 * @typedef {Object} ResultLine
 * @property {string} id
 * @property {number|null} startTime
 * @property {number|null} endTime
 * @property {number|null} confidence
 * @property {boolean} reviewRequired
 * @property {string[]} reasons
 */

/**
 * @typedef {Object} ResultWord
 * @property {string} lineId
 * @property {string} text
 * @property {number|null} startTime
 * @property {number|null} endTime
 * @property {number|null} confidence
 */

/**
 * @typedef {Object} AlignmentResult
 * @property {string} engine
 * @property {string} engineVersion
 * @property {ResultLine[]} lines
 * @property {ResultWord[]} [words]
 * @property {Object<string, unknown>} diagnostics
 * @property {Object<string, number>} timingsMs
 * @property {Object<string, unknown>} parameters
 */

/**
 * @typedef {Object} FormDescriptor
 * @property {boolean} hasTimedLyrics
 * @property {"none"|"line"|"word"} timingLevel
 * @property {boolean} hasReference
 * @property {string[]} scripts
 * @property {string|null} dominantScript
 * @property {number} lineCount
 * @property {number} duration
 * @property {number|null} vocalCoverage
 * @property {number|null} instrumentalLikelihood
 * @property {boolean} hasVocalStem
 * @property {number} repeatedLineRatio
 * @property {string} [languageHint]
 * @property {string[]} reasons
 */

const TIMING_LEVELS = new Set(["none", "line", "word"]);

/**
 * Validate an AlignmentRequest and return the original value for fluent use.
 * The request may contain functions for lazy audio profiles and cancellation;
 * those are intentionally not required to be JSON serializable.
 *
 * @param {unknown} value
 * @returns {AlignmentRequest}
 */
export function validateAlignmentRequest(value) {
  const errors = [];
  const request = recordOrError(value, "request", errors);
  if (!request) return fail("AlignmentRequest", errors);

  validateLines(request.lines, "lines", errors, { requireId: true });
  validateAudio(request.audio, "audio", errors);
  if (request.timedLyrics !== undefined) validateTimedLyrics(request.timedLyrics, "timedLyrics", errors);
  if (request.reference !== undefined) validateReference(request.reference, "reference", errors);
  validateOptions(request.options, "options", errors);
  return finish("AlignmentRequest", value, errors);
}

/**
 * Validate an AlignmentResult and return the original value for fluent use.
 * All diagnostic, timing and parameter payloads must be JSON serializable so
 * results can safely cross an Electron/mobile boundary or be written to disk.
 *
 * @param {unknown} value
 * @returns {AlignmentResult}
 */
export function validateAlignmentResult(value) {
  const errors = [];
  const result = recordOrError(value, "result", errors);
  if (!result) return fail("AlignmentResult", errors);

  nonEmptyString(result.engine, "engine", errors);
  nonEmptyString(result.engineVersion, "engineVersion", errors);
  validateResultLines(result.lines, "lines", errors);
  if (result.words !== undefined) validateResultWords(result.words, "words", errors);
  validateSerializableRecord(result.diagnostics, "diagnostics", errors);
  validateTimings(result.timingsMs, "timingsMs", errors);
  validateSerializableRecord(result.parameters, "parameters", errors);
  return finish("AlignmentResult", value, errors);
}

/**
 * Validate a FormDescriptor and return the original value for fluent use.
 *
 * @param {unknown} value
 * @returns {FormDescriptor}
 */
export function validateFormDescriptor(value) {
  const errors = [];
  const form = recordOrError(value, "form", errors);
  if (!form) return fail("FormDescriptor", errors);

  booleanValue(form.hasTimedLyrics, "hasTimedLyrics", errors);
  enumValue(form.timingLevel, TIMING_LEVELS, "timingLevel", errors);
  booleanValue(form.hasReference, "hasReference", errors);
  stringArray(form.scripts, "scripts", errors, { allowEmpty: true });
  nullableString(form.dominantScript, "dominantScript", errors);
  integerAtLeast(form.lineCount, 0, "lineCount", errors);
  finiteAtLeast(form.duration, 0, "duration", errors);
  nullableRatio(form.vocalCoverage, "vocalCoverage", errors);
  nullableRatio(form.instrumentalLikelihood, "instrumentalLikelihood", errors);
  booleanValue(form.hasVocalStem, "hasVocalStem", errors);
  ratio(form.repeatedLineRatio, "repeatedLineRatio", errors);
  if (form.languageHint !== undefined) nonEmptyString(form.languageHint, "languageHint", errors);
  stringArray(form.reasons, "reasons", errors, { allowEmpty: true });
  return finish("FormDescriptor", value, errors);
}

function validateLines(value, path, errors, { requireId }) {
  if (!Array.isArray(value) || !value.length) {
    errors.push(`${path} must be a non-empty array`);
    return;
  }
  value.forEach((line, index) => validateLine(line, `${path}[${index}]`, errors, { requireId }));
}

function validateLine(value, path, errors, { requireId }) {
  const line = recordOrError(value, path, errors);
  if (!line) return;
  if (requireId) nonEmptyString(line.id, `${path}.id`, errors);
  nonNullableString(line.text, `${path}.text`, errors);
  validateTimePair(line.startTime, line.endTime, path, errors);
  if (line.words !== undefined) validateWords(line.words, `${path}.words`, errors);
}

function validateWords(value, path, errors) {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array`);
    return;
  }
  value.forEach((word, index) => {
    const item = recordOrError(word, `${path}[${index}]`, errors);
    if (!item) return;
    nonNullableString(item.text, `${path}[${index}].text`, errors);
    validateTimePair(item.startTime, item.endTime, `${path}[${index}]`, errors);
  });
}

function validateTimedLyrics(value, path, errors) {
  const lyrics = recordOrError(value, path, errors);
  if (!lyrics) return;
  if (!Array.isArray(lyrics.timedLines)) errors.push(`${path}.timedLines must be an array`);
  else
    lyrics.timedLines.forEach((line, index) =>
      validateLine(line, `${path}.timedLines[${index}]`, errors, { requireId: false }),
    );
  if (!Array.isArray(lyrics.timedWords)) errors.push(`${path}.timedWords must be an array`);
  else validateWords(lyrics.timedWords, `${path}.timedWords`, errors);
}

function validateAudio(value, path, errors) {
  const audio = recordOrError(value, path, errors);
  if (!audio) return;
  finiteAtLeast(audio.duration, 0, `${path}.duration`, errors);
  if (audio.sampleRate !== undefined) finiteAbove(audio.sampleRate, 0, `${path}.sampleRate`, errors);
  for (const key of ["profiles", "features"]) {
    if (audio[key] !== undefined && !isRecord(audio[key]))
      errors.push(`${path}.${key} must be an object when provided`);
  }
  for (const key of ["getProfile", "getFeature", "getProfileAsync", "getFeatureAsync"]) {
    if (audio[key] !== undefined && typeof audio[key] !== "function")
      errors.push(`${path}.${key} must be a function when provided`);
  }
}

function validateReference(value, path, errors) {
  const reference = recordOrError(value, path, errors);
  if (!reference) return;
  validateAudio(reference.audio, `${path}.audio`, errors);
  if (!Array.isArray(reference.verifiedStarts) || !reference.verifiedStarts.length) {
    errors.push(`${path}.verifiedStarts must be a non-empty array`);
    return;
  }
  let previous = -Infinity;
  reference.verifiedStarts.forEach((start, index) => {
    finiteAtLeast(start, 0, `${path}.verifiedStarts[${index}]`, errors);
    if (Number.isFinite(start) && start < previous) errors.push(`${path}.verifiedStarts must be monotonic`);
    previous = start;
  });
}

function validateOptions(value, path, errors) {
  const options = recordOrError(value, path, errors);
  if (!options) return;
  nonEmptyString(options.mode, `${path}.mode`, errors);
  if (options.budgetMs !== undefined) finiteAtLeast(options.budgetMs, 0, `${path}.budgetMs`, errors);
  if (options.signal !== undefined && (!isRecord(options.signal) || typeof options.signal.aborted !== "boolean")) {
    errors.push(`${path}.signal must expose a boolean aborted property`);
  }
  if (options.onProgress !== undefined && typeof options.onProgress !== "function") {
    errors.push(`${path}.onProgress must be a function when provided`);
  }
  if (options.plugins !== undefined && !Array.isArray(options.plugins))
    errors.push(`${path}.plugins must be an array when provided`);
}

function validateResultLines(value, path, errors) {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array`);
    return;
  }
  value.forEach((line, index) => {
    const item = recordOrError(line, `${path}[${index}]`, errors);
    if (!item) return;
    nonEmptyString(item.id, `${path}[${index}].id`, errors);
    validateTimePair(item.startTime, item.endTime, `${path}[${index}]`, errors);
    nullableRatio(item.confidence, `${path}[${index}].confidence`, errors);
    booleanValue(item.reviewRequired, `${path}[${index}].reviewRequired`, errors);
    stringArray(item.reasons, `${path}[${index}].reasons`, errors, { allowEmpty: true });
  });
}

function validateResultWords(value, path, errors) {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array`);
    return;
  }
  value.forEach((word, index) => {
    const item = recordOrError(word, `${path}[${index}]`, errors);
    if (!item) return;
    nonEmptyString(item.lineId, `${path}[${index}].lineId`, errors);
    nonNullableString(item.text, `${path}[${index}].text`, errors);
    validateTimePair(item.startTime, item.endTime, `${path}[${index}]`, errors);
    nullableRatio(item.confidence, `${path}[${index}].confidence`, errors);
  });
}

function validateTimings(value, path, errors) {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return;
  }
  for (const [key, timing] of Object.entries(value)) finiteAtLeast(timing, 0, `${path}.${key}`, errors);
}

function validateTimePair(start, end, path, errors) {
  nullableTime(start, `${path}.startTime`, errors);
  nullableTime(end, `${path}.endTime`, errors);
  if (Number.isFinite(start) && Number.isFinite(end) && end < start)
    errors.push(`${path}.endTime must be >= startTime`);
}

function validateSerializableRecord(value, path, errors) {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return;
  }
  collectSerializable(value, path, errors, new Set());
}

function collectSerializable(value, path, errors, seen) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) errors.push(`${path} must not contain non-finite numbers`);
    return;
  }
  if (typeof value !== "object") {
    errors.push(`${path} contains a non-serializable value`);
    return;
  }
  if (seen.has(value)) {
    errors.push(`${path} contains a circular reference`);
    return;
  }
  seen.add(value);
  if (Array.isArray(value))
    value.forEach((item, index) => collectSerializable(item, `${path}[${index}]`, errors, seen));
  else if (isRecord(value))
    Object.entries(value).forEach(([key, item]) => collectSerializable(item, `${path}.${key}`, errors, seen));
  else errors.push(`${path} contains a non-plain object`);
  seen.delete(value);
}

function finish(name, value, errors) {
  if (errors.length) return fail(name, errors);
  return value;
}

function fail(name, errors) {
  throw new TypeError(`${name} validation failed: ${errors.join("; ") || "value is invalid"}`);
}

function recordOrError(value, path, errors) {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return null;
  }
  return value;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyString(value, path, errors) {
  if (typeof value !== "string" || !value.trim()) errors.push(`${path} must be a non-empty string`);
}

function nonNullableString(value, path, errors) {
  if (typeof value !== "string") errors.push(`${path} must be a string`);
}

function nullableString(value, path, errors) {
  if (value !== null && value !== undefined && typeof value !== "string")
    errors.push(`${path} must be a string or null`);
}

function finiteAtLeast(value, minimum, path, errors) {
  if (!Number.isFinite(value) || value < minimum) errors.push(`${path} must be a finite number >= ${minimum}`);
}

function finiteAbove(value, minimum, path, errors) {
  if (!Number.isFinite(value) || value <= minimum) errors.push(`${path} must be a finite number > ${minimum}`);
}

function nullableTime(value, path, errors) {
  if (value !== null && value !== undefined) finiteAtLeast(value, 0, path, errors);
}

function nullableRatio(value, path, errors) {
  if (value !== null && value !== undefined) ratio(value, path, errors);
}

function ratio(value, path, errors) {
  if (!Number.isFinite(value) || value < 0 || value > 1) errors.push(`${path} must be a number between 0 and 1`);
}

function integerAtLeast(value, minimum, path, errors) {
  if (!Number.isInteger(value) || value < minimum) errors.push(`${path} must be an integer >= ${minimum}`);
}

function booleanValue(value, path, errors) {
  if (typeof value !== "boolean") errors.push(`${path} must be a boolean`);
}

function enumValue(value, allowed, path, errors) {
  if (!allowed.has(value)) errors.push(`${path} must be one of: ${[...allowed].join(", ")}`);
}

function stringArray(value, path, errors, { allowEmpty }) {
  if (!Array.isArray(value) || (!allowEmpty && !value.length) || value.some((item) => typeof item !== "string")) {
    errors.push(`${path} must be an array of strings`);
  }
}
