import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const folders = ["audio", "lyrics", "features", "separation", "alignment", "timeline", "exports", "logs", "experiments"];

export async function saveProject(project, rootDirectory) {
  if (!project || !project.metadata || !project.timeline) throw new Error("Cannot save an invalid project.");
  await Promise.all(folders.map((folder) => mkdir(join(rootDirectory, folder), { recursive: true })));
  const updated = { ...project, updatedAt: new Date().toISOString() };
  await writeFile(join(rootDirectory, "project.json"), JSON.stringify(updated, null, 2) + "\n", "utf8");
  await writeFile(join(rootDirectory, "lyrics", "normalized.json"), JSON.stringify(updated.lyrics || { lines: [] }, null, 2) + "\n", "utf8");
  await writeFile(join(rootDirectory, "timeline", "timeline.json"), JSON.stringify(updated.timeline, null, 2) + "\n", "utf8");
  return updated;
}

export async function loadProject(rootDirectory) {
  const project = JSON.parse(await readFile(join(rootDirectory, "project.json"), "utf8"));
  if (!project.metadata || !project.timeline || !Array.isArray(project.timeline.lines)) throw new Error("Invalid LyricSync project.json.");
  return project;
}
