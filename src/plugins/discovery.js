import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

/** Discover only manifests from a user-selected model directory. */
export async function discoverPlugins(modelsDirectory) {
  if (!modelsDirectory) return [];
  const entries = await readdir(modelsDirectory, { withFileTypes: true });
  const manifests = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const manifestPath = join(modelsDirectory, entry.name, "manifest.json");
    try {
      const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
      manifests.push({
        ...manifest,
        manifestPath,
        verification: await verifyManifest(manifest, join(modelsDirectory, entry.name)),
      });
    } catch (error) {
      if (error.code !== "ENOENT")
        manifests.push({ id: entry.name, manifestPath, verification: { valid: false, error: error.message } });
    }
  }
  return manifests;
}

export async function verifyManifest(manifest, rootDirectory) {
  const files = Array.isArray(manifest?.files) ? manifest.files : [];
  const mismatches = [];
  for (const file of files) {
    if (!file?.path || typeof file.sha256 !== "string") {
      mismatches.push({ path: file?.path || "<missing>", reason: "invalid file entry" });
      continue;
    }
    try {
      const digest = createHash("sha256")
        .update(await readFile(join(rootDirectory, file.path)))
        .digest("hex");
      if (digest.toLowerCase() !== file.sha256.toLowerCase())
        mismatches.push({ path: file.path, reason: "sha256 mismatch" });
    } catch (error) {
      mismatches.push({ path: file.path, reason: error.message });
    }
  }
  return { valid: mismatches.length === 0, checkedFiles: files.length, mismatches };
}
