const PLUGIN_KINDS = new Set(["separator", "forced-aligner", "text-normalizer"]);

/** Validate the optional plugin contract without loading a model. */
export function validatePlugin(plugin) {
  if (!plugin || typeof plugin !== "object") throw new TypeError("Plugin must be an object.");
  if (typeof plugin.id !== "string" || !plugin.id.trim()) throw new TypeError("Plugin id must be a non-empty string.");
  if (!PLUGIN_KINDS.has(plugin.kind))
    throw new TypeError(`Plugin kind must be one of: ${[...PLUGIN_KINDS].join(", ")}.`);
  if (typeof plugin.version !== "string" || !plugin.version.trim())
    throw new TypeError("Plugin version must be a non-empty string.");
  if (typeof plugin.license !== "string" || !plugin.license.trim())
    throw new TypeError("Plugin license text is required.");
  if (!Array.isArray(plugin.requires)) throw new TypeError("Plugin requires must be an array.");
  for (const method of ["init", "run", "dispose"]) {
    if (typeof plugin[method] !== "function") throw new TypeError(`Plugin ${method}() must be a function.`);
  }
  return plugin;
}

export function describePlugin(plugin) {
  validatePlugin(plugin);
  return { id: plugin.id, kind: plugin.kind, version: plugin.version, requires: [...plugin.requires] };
}

export async function runPlugin(plugin, input, options = {}) {
  validatePlugin(plugin);
  if (options.signal?.aborted) throw abortError();
  const result = await plugin.run(input, options);
  if (options.signal?.aborted) throw abortError();
  return result;
}

function abortError() {
  const error = new Error("Plugin execution was aborted.");
  error.name = "AbortError";
  return error;
}
