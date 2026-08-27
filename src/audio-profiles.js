import { fftMagnitudes } from "./features.js";
import { resampleProfile } from "./profile-fusion.js";

function frameSignal(samples, frameSize, hopSize, callback) {
  const signal = Array.from(samples || [], Number).map((value) => Number.isFinite(value) ? value : 0);
  const frameCount = Math.max(1, Math.ceil(Math.max(1, signal.length - frameSize) / hopSize) + 1);
  return Array.from({ length: frameCount }, (_, frameIndex) => {
    const frame = new Float64Array(frameSize), start = frameIndex * hopSize;
    for (let index = 0; index < frameSize && start + index < signal.length; index++) frame[index] = signal[start + index];
    return callback(frame);
  });
}

/** Extract a normalized RMS profile suitable for profile fusion. */
export function extractRmsProfile(samples, options = {}) {
  const frameSize = options.frameSize || 1024, hopSize = options.hopSize || 512;
  return resampleProfile(frameSignal(samples, frameSize, hopSize, (frame) => Math.sqrt(frame.reduce((sum, value) => sum + value ** 2, 0) / frame.length)), options.bins || 700);
}

/** Extract positive spectral-change strength without a learned model. */
export function extractSpectralFluxProfile(samples, options = {}) {
  const frameSize = options.frameSize || 1024, hopSize = options.hopSize || 512;
  let previous = null;
  const flux = frameSignal(samples, frameSize, hopSize, (frame) => {
    const current = fftMagnitudes(frame).map((value) => Math.sqrt(value));
    const value = previous ? current.reduce((sum, item, index) => sum + Math.max(0, item - previous[index]), 0) : 0;
    previous = current;
    return value;
  });
  return resampleProfile(flux, options.bins || 700);
}

export function extractExplainableProfiles(samples, options = {}) {
  return { energy: extractRmsProfile(samples, options), spectralFlux: extractSpectralFluxProfile(samples, options) };
}
