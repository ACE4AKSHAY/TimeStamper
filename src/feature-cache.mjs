import { mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { join, resolve } from "node:path";

const CACHE_SCHEMA_VERSION = 1;

/** Create a deterministic cache key from audio identity and extraction settings. */
export function createFeatureCacheKey(identity) {
  return createHash("sha256").update(stableStringify(identity)).digest("hex");
}

/** Include file size and modification time so edited/replaced audio invalidates its cache. */
export async function createAudioFeatureCacheKey(audioPath, extraction = {}) {
  const absolutePath = resolve(audioPath);
  const file = await stat(absolutePath);
  return createFeatureCacheKey({ path: absolutePath, size: file.size, mtimeMs: file.mtimeMs, extraction });
}

export class FeatureCache {
  constructor(rootDirectory = "cache/features") {
    this.rootDirectory = resolve(rootDirectory);
  }

  pathFor(key) {
    if (!/^[a-f0-9]{64}$/u.test(String(key))) throw new TypeError("Feature cache keys must be SHA-256 hex strings.");
    return join(this.rootDirectory, `${key}.json`);
  }

  async get(key) {
    try {
      const document = JSON.parse(await readFile(this.pathFor(key), "utf8"));
      if (document.schemaVersion !== CACHE_SCHEMA_VERSION || document.key !== key) return null;
      return document.value;
    } catch (error) {
      if (error.code === "ENOENT" || error instanceof SyntaxError) return null;
      throw error;
    }
  }

  async set(key, value, metadata = {}) {
    const target = this.pathFor(key);
    await mkdir(this.rootDirectory, { recursive: true });
    const document = { schemaVersion: CACHE_SCHEMA_VERSION, key, createdAt: new Date().toISOString(), metadata, value };
    const temporary = join(this.rootDirectory, `.${key}.${randomUUID()}.tmp`);
    await writeFile(temporary, JSON.stringify(document) + "\n", "utf8");
    try {
      await rename(temporary, target);
    } catch (error) {
      // Windows may reject replacing an existing file. The cache is derived
      // data, so replacing the old entry is safe and recoverable.
      if (!(["EEXIST", "EPERM", "ENOTEMPTY"].includes(error.code))) throw error;
      await unlink(target).catch(() => {});
      await rename(temporary, target);
    }
    return document;
  }

  async delete(key) {
    await unlink(this.pathFor(key)).catch((error) => { if (error.code !== "ENOENT") throw error; });
  }
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}
