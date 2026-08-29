import { createAudioFeatureCacheKey, FeatureCache } from "./feature-cache.mjs";
import { extractExplainableProfiles } from "./audio-profiles.js";
import { extractPitchProfile, pitchVoicednessProfile } from "./pitch-profile.js";

const DEFAULT_PROFILE_OPTIONS = Object.freeze({ frameSize: 1024, hopSize: 512, bins: 700 });
const DEFAULT_PITCH_OPTIONS = Object.freeze({ frameSize: 2048, hopSize: 512, minFrequency: 70, maxFrequency: 500, voicingThreshold: 0.35 });

/**
 * Decode once, then reuse deterministic derived profiles across local runs.
 * The decoded PCM is deliberately not persisted: audio remains local and the
 * cache contains only explainable, reproducible feature arrays.
 */
export async function loadOrExtractAudioFeatures({ audioPath, decoded, cache = new FeatureCache(), enabled = true, profileOptions = {}, pitchOptions = {} }) {
  if (!audioPath || !decoded || !Number.isFinite(decoded.sampleRate)) throw new Error("Audio feature caching requires an audio path and decoded audio metadata.");
  const profilesConfig = { ...DEFAULT_PROFILE_OPTIONS, ...profileOptions };
  const pitchConfig = { ...DEFAULT_PITCH_OPTIONS, ...pitchOptions, sampleRate: decoded.sampleRate };
  const extraction = { profiles: profilesConfig, pitch: pitchConfig };
  const key = await createAudioFeatureCacheKey(audioPath, extraction);
  if (enabled) {
    const cached = await cache.get(key);
    if (cached?.profiles?.energy && cached?.profiles?.spectralFlux && cached?.pitch?.frames) {
      return { ...cached, extraction, cache: { enabled: true, hit: true, key } };
    }
  }
  const profiles = extractExplainableProfiles(decoded.samples, profilesConfig);
  const pitch = extractPitchProfile(decoded.samples, decoded.sampleRate, pitchConfig);
  const value = { profiles, pitch, voicedness: pitchVoicednessProfile(pitch) };
  if (enabled) await cache.set(key, value, { kind: "audio-features", extraction });
  return { ...value, extraction, cache: { enabled, hit: false, key: enabled ? key : null } };
}

export { DEFAULT_PITCH_OPTIONS, DEFAULT_PROFILE_OPTIONS };
