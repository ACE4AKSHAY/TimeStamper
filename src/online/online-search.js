import { normalizeResult } from "./online-provider.js";
import { rankLyricResults } from "./lyric-matcher.js";

/**
 * Fans out selected providers concurrently, isolates failures, uses the local
 * per-provider cache, and returns ranked normalized results. A provider never
 * receives audio or lyric content; only the caller's search context is sent.
 */
export async function searchOnlineLyrics({ providers, cache, query, context = {}, signal, onProviderError } = {}) {
  const selected = Array.isArray(providers) ? providers : [];
  const cacheQuery = [query, context.artist, context.title, context.duration].join("\u0000");
  const responses = await Promise.allSettled(selected.map(async (provider) => {
    const cached = cache?.get(provider.id, cacheQuery);
    if (cached !== null && cached !== undefined) return cached.map(normalizeResult);
    const results = await provider.search(query, context, { signal });
    const normalized = results.map(normalizeResult);
    cache?.set(provider.id, cacheQuery, normalized);
    return normalized;
  }));
  if (signal?.aborted) throw signal.reason || abortError("Online search cancelled.");
  const results = [];
  responses.forEach((response, index) => {
    if (response.status === "fulfilled") results.push(...response.value);
    else onProviderError?.(selected[index], response.reason);
  });
  return { results: rankLyricResults(results, context), responses };
}

function abortError(message) {
  const error = new Error(message);
  error.name = "AbortError";
  return error;
}
