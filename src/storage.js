import { isProject } from "./domain.js";

export function serializeProject(project) {
  return JSON.stringify({ ...project, updatedAt: new Date().toISOString() }, null, 2);
}

export function deserializeProject(json) {
  const project = JSON.parse(json);
  if (!isProject(project)) throw new Error("This is not a compatible LyricSync project file.");
  return project;
}

export function downloadText(content, fileName, type) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([content], { type }));
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 0);
}

export async function saveText(content, fileName, type, filters) {
  if (window.lyricSyncDesktop) {
    return window.lyricSyncDesktop.saveText({ content, fileName, filters });
  }
  downloadText(content, fileName, type);
  return { canceled: false, path: null };
}

export async function openText(filters) {
  if (!window.lyricSyncDesktop) return null;
  const result = await window.lyricSyncDesktop.openText({ filters });
  return result.canceled ? null : result;
}
