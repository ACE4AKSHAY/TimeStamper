/**
 * Platform-neutral contract for optional local vocal separation.
 *
 * The core application does not depend on a model or a particular separator.
 * A future Demucs/Spleeter/native adapter can implement `separate(input)` and
 * return decoded mono PCM. Keeping this boundary small lets the alignment
 * engines compare full-mix and vocal-assisted audio without importing a
 * desktop-only process or a machine-learning runtime.
 */
export class VocalSeparatorError extends Error {
  constructor(message, code = "VOCAL_SEPARATOR_ERROR") {
    super(message);
    this.name = "VocalSeparatorError";
    this.code = code;
  }
}

export function validateSeparatedAudio(result) {
  if (!result || !result.samples || typeof result.samples.length !== "number") throw new VocalSeparatorError("A separator must return a samples array.", "INVALID_RESULT");
  if (!Number.isFinite(result.sampleRate) || result.sampleRate <= 0) throw new VocalSeparatorError("A separator must return a positive sample rate.", "INVALID_RESULT");
  const samples = result.samples instanceof Float32Array ? result.samples : Float32Array.from(result.samples);
  if (!samples.length) throw new VocalSeparatorError("A separator returned empty audio.", "EMPTY_RESULT");
  return { ...result, samples, sampleRate: result.sampleRate, duration: Number.isFinite(result.duration) && result.duration > 0 ? result.duration : samples.length / result.sampleRate, format: result.format || "separated-pcm" };
}

export function createVocalSeparator({ name, version = "unversioned", separate }) {
  if (!name || typeof name !== "string") throw new VocalSeparatorError("A separator name is required.", "INVALID_CONFIGURATION");
  if (typeof separate !== "function") throw new VocalSeparatorError("A separator must provide a separate(input, options) function.", "INVALID_CONFIGURATION");
  return {
    name,
    version,
    async separate(input, options = {}) {
      return validateSeparatedAudio(await separate(input, options));
    },
  };
}

/** A deterministic baseline useful for wiring tests and optional-mode UIs. */
export function createPassthroughSeparator() {
  return createVocalSeparator({
    name: "passthrough",
    version: "1",
    separate: async (input) => validateSeparatedAudio(input),
  });
}
