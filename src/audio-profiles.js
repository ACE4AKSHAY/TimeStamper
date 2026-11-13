import { fftMagnitudes } from "./features.js";
import { normalizeProfile, resampleProfile } from "./profile-fusion.js";

function frameSignal(samples, frameSize, hopSize, callback) {
  const signal = Array.from(samples || [], Number).map((value) => (Number.isFinite(value) ? value : 0));
  const frameCount = Math.max(1, Math.ceil(Math.max(1, signal.length - frameSize) / hopSize) + 1);
  return Array.from({ length: frameCount }, (_, frameIndex) => {
    const frame = new Float64Array(frameSize),
      start = frameIndex * hopSize;
    for (let index = 0; index < frameSize && start + index < signal.length; index++)
      frame[index] = signal[start + index];
    return callback(frame);
  });
}

/** Extract a normalized RMS profile suitable for profile fusion. */
export function extractRmsProfile(samples, options = {}) {
  const frameSize = options.frameSize || 1024,
    hopSize = options.hopSize || 512;
  return resampleProfile(
    frameSignal(samples, frameSize, hopSize, (frame) =>
      Math.sqrt(frame.reduce((sum, value) => sum + value ** 2, 0) / frame.length),
    ),
    options.bins || 700,
  );
}

/** Extract positive spectral-change strength without a learned model. */
export function extractSpectralFluxProfile(samples, options = {}) {
  const frameSize = options.frameSize || 1024,
    hopSize = options.hopSize || 512;
  let previous = null;
  const flux = frameSignal(samples, frameSize, hopSize, (frame) => {
    const current = fftMagnitudes(frame).map((value) => Math.sqrt(value));
    const value = previous ? current.reduce((sum, item, index) => sum + Math.max(0, item - previous[index]), 0) : 0;
    previous = current;
    return value;
  });
  return resampleProfile(flux, options.bins || 700);
}

/**
 * Cheap, language-neutral vocalness proxy for interactive desktop routing.
 * It is intentionally not a voice recognizer: low-band concentration and a
 * bounded zero-crossing penalty only help suppress obvious percussive/noisy
 * peaks before the user reviews the editable result.
 */
export function extractVoicednessProfile(samples, options = {}) {
  const frameSize = options.frameSize || 1024,
    hopSize = options.hopSize || 512;
  const proxy = frameSignal(samples, frameSize, hopSize, (frame) => {
    let crossings = 0;
    for (let index = 1; index < frame.length; index++) if (frame[index - 1] < 0 !== frame[index] < 0) crossings++;
    const spectrum = fftMagnitudes(frame).map((value) => Math.sqrt(value));
    const split = Math.max(1, Math.floor(spectrum.length * 0.25));
    const low = spectrum.slice(0, split).reduce((sum, value) => sum + value, 0);
    const total = spectrum.reduce((sum, value) => sum + value, 0) || 1;
    const crossingPenalty = Math.max(0, 1 - (crossings / Math.max(1, frame.length)) * 4);
    return (low / total) * crossingPenalty;
  });
  return normalizeProfile(resampleProfile(proxy, options.bins || 700));
}

export function extractExplainableProfiles(samples, options = {}) {
  return {
    energy: extractRmsProfile(samples, options),
    spectralFlux: extractSpectralFluxProfile(samples, options),
    voicedness: extractVoicednessProfile(samples, options),
  };
}
