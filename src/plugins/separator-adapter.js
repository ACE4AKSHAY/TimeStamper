import { createVocalSeparator } from "../vocal-separator.js";
import { validatePlugin } from "./contract.js";

/** Adapt a separator plugin to the existing model-agnostic separator contract. */
export function createSeparatorFromPlugin(plugin) {
  validatePlugin(plugin);
  if (plugin.kind !== "separator") throw new TypeError("Only separator plugins can be adapted as vocal separators.");
  return createVocalSeparator({
    name: plugin.id,
    version: plugin.version,
    separate: (input, options) => plugin.run(input, options),
  });
}
