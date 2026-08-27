const TWO_PI = 2 * Math.PI;

function nextPowerOfTwo(value) { let size = 1; while (size < value) size *= 2; return size; }
function hzToMel(hz) { return 2595 * Math.log10(1 + hz / 700); }
function melToHz(mel) { return 700 * (10 ** (mel / 2595) - 1); }

export function fftMagnitudes(frame) {
  const size = nextPowerOfTwo(frame.length); const real = new Float64Array(size); const imag = new Float64Array(size);
  for (let i = 0; i < frame.length; i++) real[i] = frame[i] * (0.54 - 0.46 * Math.cos(TWO_PI * i / Math.max(1, frame.length - 1)));
  for (let i = 1, j = 0; i < size; i++) { let bit = size >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [real[i], real[j]] = [real[j], real[i]]; } }
  for (let length = 2; length <= size; length *= 2) { const angle = -TWO_PI / length; const wReal = Math.cos(angle); const wImag = Math.sin(angle); for (let start = 0; start < size; start += length) { let currentReal = 1; let currentImag = 0; for (let i = 0; i < length / 2; i++) { const even = start + i, odd = even + length / 2, productReal = currentReal * real[odd] - currentImag * imag[odd], productImag = currentReal * imag[odd] + currentImag * real[odd]; real[odd] = real[even] - productReal; imag[odd] = imag[even] - productImag; real[even] += productReal; imag[even] += productImag; const nextReal = currentReal * wReal - currentImag * wImag; currentImag = currentReal * wImag + currentImag * wReal; currentReal = nextReal; } } }
  return Array.from({ length: size / 2 + 1 }, (_, index) => (real[index] ** 2 + imag[index] ** 2) / size);
}

export function extractMfcc(samples, sampleRate, options = {}) {
  const frameSize = options.frameSize || 512, hopSize = options.hopSize || 256, melBands = options.melBands || 26, coefficients = options.coefficients || 13;
  if (!Number.isFinite(sampleRate) || sampleRate <= 0 || frameSize <= 0 || hopSize <= 0) throw new Error("MFCC requires a positive sample rate, frame size and hop size.");
  const signal = Array.from(samples || [], Number); const frameCount = Math.max(1, Math.ceil(Math.max(1, signal.length - frameSize) / hopSize) + 1); const fftSize = nextPowerOfTwo(frameSize); const maxFrequency = sampleRate / 2;
  const melPoints = Array.from({ length: melBands + 2 }, (_, i) => melToHz(hzToMel(0) + (hzToMel(maxFrequency) - hzToMel(0)) * i / (melBands + 1)));
  const bins = melPoints.map((frequency) => Math.min(fftSize / 2, Math.max(0, Math.floor((fftSize + 1) * frequency / sampleRate))));
  const filters = Array.from({ length: melBands }, (_, band) => { const filter = new Float64Array(fftSize / 2 + 1); const left = bins[band], center = Math.max(left + 1, bins[band + 1]), right = Math.max(center + 1, bins[band + 2]); for (let i = left; i < center && i < filter.length; i++) filter[i] = (i - left) / (center - left); for (let i = center; i < right && i < filter.length; i++) filter[i] = (right - i) / (right - center); return filter; });
  const frames = [];
  for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
    const start = frameIndex * hopSize, frame = new Float64Array(frameSize); for (let i = 0; i < frameSize && start + i < signal.length; i++) frame[i] = signal[start + i];
    const power = fftMagnitudes(frame); const logEnergies = filters.map((filter) => Math.log(Math.max(1e-12, power.reduce((sum, value, index) => sum + value * filter[index], 0))));
    frames.push(Array.from({ length: coefficients }, (_, coefficient) => logEnergies.reduce((sum, value, index) => sum + value * Math.cos(Math.PI * coefficient * (index + 0.5) / melBands), 0)));
  }
  return { frames, frameRate: sampleRate / hopSize, frameSize, hopSize, sampleRate, melBands, coefficients };
}
