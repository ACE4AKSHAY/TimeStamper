import { createAudioFeatureCacheKey, FeatureCache } from "./feature-cache.mjs";
import { extractMfcc } from "./features.js";

const DEFAULT_MFCC_OPTIONS = Object.freeze({ frameSize: 512, hopSize: 256, melBands: 26, coefficients: 13 });

/** Cache one whole-recording MFCC extraction for repeated reference/target runs. */
export async function loadOrExtractMfcc({ audioPath, decoded, cache = new FeatureCache(), enabled = true, options = {} }) {
  if (!audioPath || !decoded || !Number.isFinite(decoded.sampleRate)) throw new Error("MFCC caching requires an audio path and decoded audio metadata.");
  const extraction = { ...DEFAULT_MFCC_OPTIONS, ...options };
  const key = await createAudioFeatureCacheKey(audioPath, { kind: "mfcc", ...extraction });
  if (enabled) {
    const cached = await cache.get(key);
    if (cached?.frames?.length && Number.isFinite(cached.frameRate)) return { ...cached, extraction, cache: { enabled: true, hit: true, key } };
  }
  const value = extractMfcc(decoded.samples, decoded.sampleRate, extraction);
  if (enabled) await cache.set(key, value, { kind: "mfcc", extraction });
  return { ...value, extraction, cache: { enabled, hit: false, key: enabled ? key : null } };
}

export { DEFAULT_MFCC_OPTIONS };
