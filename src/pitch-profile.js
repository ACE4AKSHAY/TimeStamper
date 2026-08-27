function frameSignal(samples, frameSize, hopSize, callback) {
  const signal = Array.from(samples || [], Number).map((value) => Number.isFinite(value) ? value : 0);
  const frameCount = Math.max(1, Math.ceil(Math.max(1, signal.length - frameSize) / hopSize) + 1);
  return Array.from({ length: frameCount }, (_, frameIndex) => {
    const frame = new Float64Array(frameSize), start = frameIndex * hopSize;
    for (let index = 0; index < frameSize && start + index < signal.length; index++) frame[index] = signal[start + index];
    return callback(frame, start);
  });
}

function estimateFrame(frame, sampleRate, minFrequency, maxFrequency, voicingThreshold) {
  const mean = frame.reduce((sum, value) => sum + value, 0) / frame.length;
  const centered = frame.map((value) => value - mean);
  const energy = centered.reduce((sum, value) => sum + value * value, 0) / centered.length;
  if (energy < 1e-8) return { frequencyHz: null, confidence: 0, voiced: false, energy };
  const minimumLag = Math.max(2, Math.floor(sampleRate / maxFrequency));
  const maximumLag = Math.min(frame.length - 2, Math.ceil(sampleRate / minFrequency));
  const denominator = centered.reduce((sum, value) => sum + value * value, 0);
  let bestLag = 0, bestCorrelation = -1;
  for (let lag = minimumLag; lag <= maximumLag; lag++) {
    let correlation = 0;
    for (let index = 0; index + lag < centered.length; index++) correlation += centered[index] * centered[index + lag];
    correlation /= denominator || 1;
    if (correlation > bestCorrelation) { bestCorrelation = correlation; bestLag = lag; }
  }
  const frequencyHz = bestLag ? sampleRate / bestLag : null;
  const voiced = Boolean(frequencyHz && bestCorrelation >= voicingThreshold);
  return { frequencyHz: voiced ? frequencyHz : null, confidence: Math.max(0, Math.min(1, bestCorrelation)), voiced, energy };
}

/** Estimate voiced fundamental frequency with bounded autocorrelation. */
export function extractPitchProfile(samples, sampleRate, options = {}) {
  const frameSize = options.frameSize || 2048, hopSize = options.hopSize || 512, minFrequency = options.minFrequency || 70, maxFrequency = options.maxFrequency || 500, voicingThreshold = options.voicingThreshold ?? 0.35;
  if (!Number.isFinite(sampleRate) || sampleRate <= 0 || frameSize <= 0 || hopSize <= 0 || minFrequency <= 0 || maxFrequency <= minFrequency) throw new Error("Pitch estimation requires valid sample rate, frame, hop and frequency bounds.");
  const frames = frameSignal(samples, frameSize, hopSize, (frame) => estimateFrame(frame, sampleRate, minFrequency, maxFrequency, voicingThreshold));
  return { frames, frameRate: sampleRate / hopSize, frameSize, hopSize, sampleRate, minFrequency, maxFrequency, voicingThreshold };
}

/** Convert pitch output into a 0..1 voicedness profile for later fusion. */
export function pitchVoicednessProfile(pitch) {
  return (pitch?.frames || []).map((frame) => frame.voiced ? frame.confidence : 0);
}
