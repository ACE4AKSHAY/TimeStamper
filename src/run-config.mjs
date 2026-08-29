export const RUN_CONFIG_SCHEMA_VERSION = 1;

/**
 * Build a serializable record of the settings that produced an alignment.
 * Timestamps and generatedAt are intentionally excluded so this describes a
 * reproducible method rather than one particular run's output.
 */
export function createRunConfiguration({ workflow, engine = null, engines = [], decoder = {}, featureExtraction = {}, cache = {} }) {
  return {
    schemaVersion: RUN_CONFIG_SCHEMA_VERSION,
    workflow: workflow || "unspecified",
    engine,
    engines: Array.from(engines || []),
    decoder: {
      format: decoder.format || null,
      sampleRate: Number.isFinite(decoder.sampleRate) ? decoder.sampleRate : null,
      duration: Number.isFinite(decoder.duration) ? decoder.duration : null,
    },
    featureExtraction,
    cache: {
      enabled: cache.enabled === true,
      key: cache.key || null,
      identity: "absolute-path + file-size + modification-time + extraction-settings (SHA-256)",
    },
  };
}
