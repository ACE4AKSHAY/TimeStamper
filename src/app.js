import { createLine, createProject } from "./domain.js";
import { parseLyrics, linesToText } from "./lyrics.js";
import { exportLrc, secondsToLrc } from "./lrc.js";
import { deserializeProject, downloadText, openText, saveText, serializeProject } from "./storage.js";
import { ProjectLogger } from "./logger.js";
import { DEFAULT_SETTINGS, applySettings, loadSettings, saveSettings } from "./settings.js";
import { createEnergyInitialTimeline } from "./energy-aligner.js";
import { parseEditorTime } from "./time-utils.js";

const $ = (id) => document.getElementById(id);
let project = createProject(); let audioUrl = null; let selectedId = null; let peaks = []; let energyProfile = []; let waveformDragging = false; let scanTimer = null; let scanWasPlaying = false; let toastTimer = null; let settings = loadSettings();
const log = new ProjectLogger(renderLog); const audio = $("audio");
const timelineLines = () => project.timeline.lines;
const timestamp = (time) => Number.isFinite(time) ? secondsToLrc(time) : "—";
const safeName = (value) => (value || "lyricsync-project").replace(/[<>:"/\\|?*]+/gu, "-").trim() || "lyricsync-project";

function formatClock(seconds) {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const hours = Math.floor(safe / 3600), minutes = Math.floor(safe / 60) % 60, wholeSeconds = Math.floor(safe) % 60, milliseconds = Math.floor((safe % 1) * 1000);
  return `${hours ? `${String(hours).padStart(2, "0")}:` : ""}${String(minutes).padStart(2, "0")}:${String(wholeSeconds).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`;
}

function activeStampTime() { const typed = $("stamp-time").value.trim(); return typed ? parseEditorTime(typed) : audio.currentTime; }
function adjustmentSeconds() { return Math.max(0.001, Number($("adjust-ms").value) / 1000 || 0.1); }
function updateMetadata() { ["title", "artist", "album", "language"].forEach((key) => { project.metadata[key] = $(key).value.trim(); }); }
function showToast(message, level = "info") { const toast = $("toast"); toast.textContent = message; toast.className = `toast visible ${level}`; clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.className = "toast"; }, 2600); }
function normalizedShortcut(key) { if (key === " ") return "Space"; if (key.length === 1) return key.toUpperCase(); return key; }
function shortcutLabel(key) { return key === "ArrowLeft" ? "←" : key === "ArrowRight" ? "→" : key === "Escape" ? "Esc" : key; }
function seekToTime(seconds) { if (!audio.duration || !Number.isFinite(seconds)) return; const bounded = Math.max(0, Math.min(audio.duration, seconds)); audio.currentTime = bounded; updatePositionDisplays(bounded); renderWaveform(); return bounded; }
function selectLine(line, seek = true) { selectedId = line.id; if (seek && Number.isFinite(line.startTime)) seekToTime(line.startTime); renderTimeline(); }
function scrollSelectedLineIntoView() { requestAnimationFrame(() => { const selected = $("timeline").querySelector("tr.selected"); selected?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }); }
function previousTimestamp(line) { const index = timelineLines().indexOf(line); return index > 0 ? timelineLines()[index - 1].startTime : null; }
function acceptsTimestamp(line, seconds) { const previous = previousTimestamp(line); if (Number.isFinite(previous) && seconds < previous) { showToast(`Line ${line.order + 1} must be at or after the previous line (${formatClock(previous)}).`, "warning"); return false; } return true; }

function render() {
  ["title", "artist", "album", "language"].forEach((key) => { $(key).value = project.metadata[key] || ""; });
  $("lyrics-text").value = linesToText(project.lyrics.lines);
  $("lyrics-status").textContent = `${project.lyrics.lines.length} lyric line(s) loaded`;
  $("audio-status").textContent = project.audio.name ? `${project.audio.name}${project.audio.duration ? ` · ${formatClock(project.audio.duration)}` : ""}` : "No audio selected";
  const enabled = Boolean(project.audio.name);
  $("remove-audio").disabled = !enabled;
  $("remove-lyrics").disabled = !timelineLines().length;
  ["reset-audio", "rewind", "play-toggle", "fast-forward", "seek", "jump-to-time", "stamp", "shift-earlier", "shift-later"].forEach((id) => { $(id).disabled = !enabled; });
  $("auto-timestamp").disabled = !enabled || !timelineLines().length || !energyProfile.length;
  renderTimeline(); renderWaveform(); updatePositionDisplays();
}

function renderTimeline() {
  $("timeline").replaceChildren(...timelineLines().map((line, index) => {
    const tr = document.createElement("tr"); tr.className = line.id === selectedId ? "selected" : "";
    tr.innerHTML = `<td>${index + 1}</td><td><input class="time-input" aria-label="Timestamp for line ${index + 1}" value="${Number.isFinite(line.startTime) ? formatClock(line.startTime) : ""}" placeholder="mm:ss.mmm" title="mm:ss.mmm or mm:ss:mmm" inputmode="numeric"></td><td class="line-text"></td><td class="row-actions"><button data-action="stamp" aria-label="Stamp chosen time" title="Stamp chosen time">⏱</button> <button data-action="clear" aria-label="Clear timestamp" title="Clear timestamp">⌫</button> <button data-action="insert" aria-label="Insert empty line after" title="Insert empty line after">＋</button> <button data-action="duplicate" aria-label="Duplicate line" title="Duplicate line">⧉</button> <button data-action="delete" aria-label="Delete lyric line" title="Delete lyric line">✕</button></td>`;
    tr.querySelector(".line-text").textContent = line.originalText;
    tr.addEventListener("click", (event) => { if (!event.target.matches("input,button")) selectLine(line); });
    tr.querySelector(".line-text").addEventListener("click", () => selectLine(line));
    tr.querySelector("input").addEventListener("click", () => { if (selectedId !== line.id) selectLine(line); else if (Number.isFinite(line.startTime)) seekToTime(line.startTime); });
    tr.querySelector("input").addEventListener("change", (event) => setTimestamp(line, event.target.value));
    tr.querySelector('[data-action="stamp"]').addEventListener("click", () => stamp(line));
    tr.querySelector('[data-action="clear"]').addEventListener("click", () => { line.startTime = null; line.manuallyCorrected = true; log.info(`Cleared timestamp for line ${index + 1}`); showToast(`Cleared timestamp for line ${index + 1}.`); render(); });
    tr.querySelector('[data-action="insert"]').addEventListener("click", () => insertLineAfter(index, ""));
    tr.querySelector('[data-action="duplicate"]').addEventListener("click", () => insertLineAfter(index, line.originalText, line.startTime));
    tr.querySelector('[data-action="delete"]').addEventListener("click", () => deleteLine(index));
    return tr;
  })); scrollSelectedLineIntoView();
}

function deleteLine(index) {
  const lines = timelineLines();
  const [removed] = lines.splice(index, 1);
  lines.forEach((item, order) => { item.order = order; });
  project.lyrics.lines = lines;
  selectedId = lines[index]?.id || lines[index - 1]?.id || null;
  log.info(`Deleted lyric line ${index + 1}: ${removed?.originalText || "(empty)"}`);
  showToast(`Deleted lyric line ${index + 1}.`);
  render();
}

function insertLineAfter(index, text, startTime = null) {
  const line = createLine(text, index + 1); line.startTime = startTime; line.source = "manual"; line.manuallyCorrected = true;
  timelineLines().splice(index + 1, 0, line); timelineLines().forEach((item, order) => { item.order = order; }); project.lyrics.lines = timelineLines(); selectedId = line.id;
  log.info(text ? `Duplicated line ${index + 1}.` : `Inserted empty line after line ${index + 1}.`); render();
}

function setTimestamp(line, value) {
  const seconds = parseEditorTime(value);
  if (seconds === null) { const message = `Invalid timestamp “${value}”. Use mm:ss.mmm, mm:ss:mmm, hh:mm:ss.mmm, or seconds.`; log.warning(message); showToast(message, "warning"); renderTimeline(); return; }
  if (Number.isFinite(audio.duration) && seconds > audio.duration) { const message = `Timestamp ${formatClock(seconds)} is beyond the audio duration (${formatClock(audio.duration)}).`; log.warning(message); showToast(message, "warning"); renderTimeline(); return; }
  if (!acceptsTimestamp(line, seconds)) { renderTimeline(); return; }
  line.startTime = seconds; line.manuallyCorrected = true; selectedId = line.id; log.info(`Set timestamp for line ${line.order + 1} to ${formatClock(seconds)}`); render();
}

function stamp(line = timelineLines().find((item) => item.id === selectedId)) {
  if (!line) { log.warning("Select a lyric line before stamping."); return; }
  const time = activeStampTime();
  if (time === null) { const message = "The stamp time is invalid. Use mm:ss.mmm, mm:ss:mmm, hh:mm:ss.mmm, or seconds."; log.warning(message); showToast(message, "warning"); return; }
  const currentIndex = timelineLines().indexOf(line);
  const boundedTime = Math.min(time, audio.duration || time); if (!acceptsTimestamp(line, boundedTime)) return;
  line.startTime = boundedTime; line.manuallyCorrected = true; selectedId = timelineLines()[currentIndex + 1]?.id || line.id; log.info(`Stamped line ${line.order + 1} at ${formatClock(line.startTime)}${selectedId !== line.id ? "; selected the next line." : ""}`); render();
}

function shiftSelected(direction) {
  const line = timelineLines().find((item) => item.id === selectedId);
  if (!line || !Number.isFinite(line.startTime)) { log.warning("Select a timestamped line to adjust it."); return; }
  const delta = direction * adjustmentSeconds(); const nextTime = Math.max(0, line.startTime + delta); if (!acceptsTimestamp(line, nextTime)) return; line.startTime = nextTime; line.manuallyCorrected = true; log.info(`Adjusted line ${line.order + 1} by ${Math.round(delta * 1000)} ms`); render();
}

function createInitialTiming() {
  if (!energyProfile.length) { log.warning("Wait for the waveform and energy profile to finish loading."); return; }
  project.timeline.lines = createEnergyInitialTimeline(timelineLines(), energyProfile, audio.duration); project.lyrics.lines = project.timeline.lines;
  selectedId = timelineLines()[0]?.id || null; log.info("Generated editable energy-based initial timestamps. Review every line before export."); render();
}

async function loadAudio(file) {
  if (audioUrl) URL.revokeObjectURL(audioUrl); audioUrl = URL.createObjectURL(file); audio.src = audioUrl;
  peaks = []; energyProfile = [];
  project.audio = { name: file.name, type: file.type, duration: null, sourceHint: "Select this audio file again after reopening the project." }; log.info(`Audio selected: ${file.name}`); render();
}

function removeAudio() {
  if (audioUrl) URL.revokeObjectURL(audioUrl);
  audioUrl = null; audio.pause(); audio.removeAttribute("src"); audio.load();
  project.audio = { name: "", type: "", duration: null, sourceHint: "" }; peaks = []; energyProfile = [];
  $("audio-file").value = ""; log.info("Audio removed from the project."); showToast("Audio removed."); render();
}

function removeLyrics() {
  project.lyrics = { source: "manual", lines: [] }; project.timeline.lines = []; selectedId = null;
  $("lyrics-file").value = ""; $("lyrics-text").value = ""; log.info("Lyrics removed from the project."); showToast("Lyrics removed."); render();
}

function loadLyrics(text, source = "pasted") {
  const parsed = parseLyrics(text, source); project.lyrics = { source, lines: parsed.lines }; project.timeline.lines = parsed.lines;
  project.metadata.artist ||= parsed.metadata.ar || ""; project.metadata.title ||= parsed.metadata.ti || ""; project.metadata.album ||= parsed.metadata.al || ""; project.metadata.language ||= parsed.metadata.la || "";
  selectedId = parsed.lines[0]?.id || null; log.info(`Loaded ${parsed.lines.length} lyric line(s) from ${source}.`); render();
}

function updatePositionDisplays(seconds = audio.currentTime || 0) {
  const text = formatClock(seconds); $("playback-time").textContent = `${text} / ${formatClock(audio.duration || project.audio.duration || 0)}`; $("seek").value = seconds; $("seek-preview").textContent = text;
  const percent = audio.duration ? Math.max(0, Math.min(100, seconds / audio.duration * 100)) : 0; $("seek-preview").style.left = `${percent}%`;
  if (document.activeElement !== $("stamp-time")) $("stamp-time").value = text;
}

function renderWaveform() {
  const canvas = $("waveform"), ctx = canvas.getContext("2d"), width = canvas.width, height = canvas.height, styles = getComputedStyle(document.documentElement);
  ctx.fillStyle = styles.getPropertyValue("--wave-bg"); ctx.fillRect(0, 0, width, height); ctx.strokeStyle = styles.getPropertyValue("--border"); ctx.beginPath(); ctx.moveTo(0, height / 2); ctx.lineTo(width, height / 2); ctx.stroke();
  if (peaks.length) { ctx.strokeStyle = styles.getPropertyValue("--wave-color"); ctx.beginPath(); peaks.forEach((peak, index) => { const x = index / (peaks.length - 1) * width, y = peak * height * .42; ctx.moveTo(x, height / 2 - y); ctx.lineTo(x, height / 2 + y); }); ctx.stroke(); }
  if (audio.duration) { const x = audio.currentTime / audio.duration * width; ctx.strokeStyle = styles.getPropertyValue("--playhead-color"); ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
}

function seekFromWaveform(event, commit = true) {
  if (!audio.duration) return;
  const rect = $("waveform").getBoundingClientRect(), fraction = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), seconds = fraction * audio.duration, tooltip = $("waveform-tooltip");
  tooltip.textContent = formatClock(seconds); tooltip.style.left = `${fraction * 100}%`; tooltip.classList.add("visible");
  if (commit) { audio.currentTime = seconds; updatePositionDisplays(seconds); renderWaveform(); }
}

async function extractWaveform(file) {
  try { const context = new AudioContext(), buffer = await context.decodeAudioData(await file.arrayBuffer()), data = buffer.getChannelData(0), bins = 700, step = Math.max(1, Math.floor(data.length / bins)); peaks = Array.from({ length: bins }, (_, bin) => { let max = 0; for (let i = bin * step; i < Math.min(data.length, (bin + 1) * step); i++) max = Math.max(max, Math.abs(data[i])); return max; }); energyProfile = Array.from({ length: bins }, (_, bin) => { let sum = 0; for (let i = bin * step; i < Math.min(data.length, (bin + 1) * step); i++) sum += data[i] ** 2; return Math.sqrt(sum / step); }); await context.close(); log.info(`Waveform and RMS energy extracted (${buffer.duration.toFixed(1)} seconds).`); render(); } catch (error) { peaks = []; energyProfile = []; log.warning(`Waveform preview unavailable: ${error.message}`); renderWaveform(); }
}

function renderLog(entries) { $("log").textContent = entries.map((entry) => `[${entry.at.slice(11, 19)}] ${entry.level}: ${entry.message}`).join("\n"); }
function togglePlayback() { if (audio.paused) audio.play(); else audio.pause(); }
function setPlayButton(isPlaying) { $("play-toggle").innerHTML = `<span aria-hidden="true">${isPlaying ? "■" : "▶"}</span>`; $("play-toggle").setAttribute("aria-label", isPlaying ? "Stop" : "Play"); $("play-toggle").title = isPlaying ? "Stop" : "Play"; }
function resetAudio() { audio.pause(); audio.currentTime = 0; updatePositionDisplays(0); renderWaveform(); }
function startScan(direction) { if (scanTimer) return; scanWasPlaying = !audio.paused; if (direction > 0) { audio.playbackRate = 3; audio.play(); } else { audio.pause(); scanTimer = setInterval(() => { audio.currentTime = Math.max(0, audio.currentTime - 0.15); }, 50); } }
function stopScan(direction) { if (direction > 0) { audio.playbackRate = 1; if (!scanWasPlaying) audio.pause(); } else if (scanTimer) { clearInterval(scanTimer); scanTimer = null; if (scanWasPlaying) audio.play(); } }

$("audio-file").addEventListener("change", async (event) => { const file = event.target.files[0]; if (file) { await loadAudio(file); extractWaveform(file); } });
$("lyrics-file").addEventListener("change", async (event) => { const file = event.target.files[0]; if (file) { const text = await file.text(); $("lyrics-text").value = text; loadLyrics(text, file.name.toLowerCase().endsWith(".lrc") ? "lrc" : "txt"); } });
$("remove-audio").addEventListener("click", removeAudio); $("remove-lyrics").addEventListener("click", removeLyrics);
$("load-lyrics").addEventListener("click", () => loadLyrics($("lyrics-text").value)); $("clear-timestamps").addEventListener("click", () => { timelineLines().forEach((line) => { line.startTime = null; }); log.info("Cleared all timestamps."); render(); });
$("play-toggle").addEventListener("click", togglePlayback); $("seek").addEventListener("input", (event) => { const seconds = Number(event.target.value); audio.currentTime = seconds; updatePositionDisplays(seconds); renderWaveform(); });
$("reset-audio").addEventListener("click", resetAudio); ["pointerup", "pointerleave", "pointercancel"].forEach((eventName) => $("rewind").addEventListener(eventName, () => stopScan(-1))); $("rewind").addEventListener("pointerdown", () => startScan(-1)); ["pointerup", "pointerleave", "pointercancel"].forEach((eventName) => $("fast-forward").addEventListener(eventName, () => stopScan(1))); $("fast-forward").addEventListener("pointerdown", () => startScan(1));
function jumpToTypedTime() { const value = $("jump-time").value; const seconds = parseEditorTime(value); if (seconds === null) { const message = `Invalid time “${value}”. Use mm:ss.mmm, mm:ss:mmm, hh:mm:ss.mmm, or seconds.`; log.warning(message); showToast(message, "warning"); return; } const bounded = seekToTime(seconds); if (Number.isFinite(bounded) && bounded !== seconds) showToast(`Moved to the end of the audio (${formatClock(bounded)}).`); }
$("jump-to-time").addEventListener("click", jumpToTypedTime); $("jump-time").addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); jumpToTypedTime(); } });
$("stamp").addEventListener("click", () => stamp()); $("shift-earlier").addEventListener("click", () => shiftSelected(-1)); $("shift-later").addEventListener("click", () => shiftSelected(1));
$("auto-timestamp").addEventListener("click", createInitialTiming);
$("waveform").addEventListener("pointerdown", (event) => { waveformDragging = true; $("waveform").setPointerCapture(event.pointerId); seekFromWaveform(event); }); $("waveform").addEventListener("pointermove", (event) => { seekFromWaveform(event, waveformDragging); }); $("waveform").addEventListener("pointerup", (event) => { waveformDragging = false; $("waveform").releasePointerCapture(event.pointerId); $("waveform-tooltip").classList.remove("visible"); }); $("waveform").addEventListener("pointerleave", () => { if (!waveformDragging) $("waveform-tooltip").classList.remove("visible"); });
$("new-project").addEventListener("click", () => { if (confirm("Start a new project? Unsaved changes will be lost.")) { if (audioUrl) URL.revokeObjectURL(audioUrl); audioUrl = null; audio.pause(); audio.removeAttribute("src"); audio.load(); project = createProject(); selectedId = null; peaks = []; energyProfile = []; $("audio-file").value = ""; $("lyrics-file").value = ""; log.info("New project created."); render(); } });
$("save-project").addEventListener("click", async () => { updateMetadata(); const result = await saveText(serializeProject(project), `${safeName(project.metadata.title)}.lyricsync.json`, "application/json", [{ name: "LyricSync project", extensions: ["json"] }]); if (!result.canceled) log.info(result.path ? `Project saved: ${result.path}` : "Project file downloaded."); });
$("export-lrc").addEventListener("click", async () => { updateMetadata(); const count = timelineLines().filter((line) => Number.isFinite(line.startTime)).length; if (!count) { log.warning("No timestamps to export."); return; } const result = await saveText(exportLrc(project), `${safeName(project.metadata.title)}.lrc`, "text/plain;charset=utf-8", [{ name: "LRC lyrics", extensions: ["lrc"] }]); if (!result.canceled) log.info(result.path ? `LRC exported: ${result.path}` : `Exported ${count} timestamped line(s) as LRC.`); });
$("open-project").addEventListener("click", async () => { const desktopFile = await openText([{ name: "LyricSync project", extensions: ["json"] }]); if (!desktopFile) { if (!window.lyricSyncDesktop) $("project-file").click(); return; } try { project = deserializeProject(desktopFile.content); selectedId = project.timeline.lines[0]?.id || null; peaks = []; log.info(`Opened project: ${desktopFile.path}. Re-select the audio file to play it.`); render(); } catch (error) { log.error(error.message); alert(error.message); } });
$("project-file").addEventListener("change", async (event) => { const file = event.target.files[0]; if (!file) return; try { project = deserializeProject(await file.text()); selectedId = project.timeline.lines[0]?.id || null; peaks = []; log.info(`Opened project: ${file.name}. Re-select the audio file to play it.`); render(); } catch (error) { log.error(error.message); alert(error.message); } }); $("download-log").addEventListener("click", () => downloadText(log.text(), "lyricsync.log", "text/plain;charset=utf-8"));
function setShortcutInput(id, value) { $(id).dataset.shortcut = value; $(id).value = shortcutLabel(value); }
function populateShortcutInputs() { setShortcutInput("shortcut-play", settings.shortcuts.playToggle); setShortcutInput("shortcut-stamp", settings.shortcuts.stamp); setShortcutInput("shortcut-earlier", settings.shortcuts.playbackEarlier); setShortcutInput("shortcut-later", settings.shortcuts.playbackLater); }
$("open-settings").addEventListener("click", () => { $("theme-setting").value = settings.theme; $("waveform-color-setting").value = settings.waveformColor; $("text-scale-setting").value = settings.textScale; populateShortcutInputs(); $("settings-dialog").showModal(); });
$("save-settings").addEventListener("click", (event) => { const readShortcut = (id) => $(id).dataset.shortcut || normalizedShortcut($(id).value); const shortcuts = { playToggle: readShortcut("shortcut-play"), stamp: readShortcut("shortcut-stamp"), playbackEarlier: readShortcut("shortcut-earlier"), playbackLater: readShortcut("shortcut-later") }; if (new Set(Object.values(shortcuts)).size !== Object.values(shortcuts).length) { event.preventDefault(); showToast("Each keyboard shortcut must be different.", "warning"); return; } settings = { theme: $("theme-setting").value, waveformColor: $("waveform-color-setting").value, textScale: $("text-scale-setting").value, shortcuts }; saveSettings(settings); applySettings(settings); renderWaveform(); log.info("General settings and shortcuts saved locally."); });
$("reset-settings").addEventListener("click", () => { settings = { ...DEFAULT_SETTINGS, shortcuts: { ...DEFAULT_SETTINGS.shortcuts } }; $("theme-setting").value = settings.theme; $("waveform-color-setting").value = settings.waveformColor; $("text-scale-setting").value = settings.textScale; populateShortcutInputs(); applySettings(settings); renderWaveform(); });
[["shortcut-play", "playToggle"], ["shortcut-stamp", "stamp"], ["shortcut-earlier", "playbackEarlier"], ["shortcut-later", "playbackLater"]].forEach(([id]) => $(id).addEventListener("keydown", (event) => { if (["Tab", "Shift", "Control", "Alt", "Meta"].includes(event.key)) return; event.preventDefault(); const value = normalizedShortcut(event.key); setShortcutInput(id, value); }));
audio.addEventListener("loadedmetadata", () => { project.audio.duration = audio.duration; $("seek").max = audio.duration; log.info(`Audio duration: ${audio.duration.toFixed(3)} seconds.`); render(); }); audio.addEventListener("timeupdate", () => { updatePositionDisplays(); renderWaveform(); }); audio.addEventListener("play", () => setPlayButton(true)); audio.addEventListener("pause", () => setPlayButton(false)); audio.addEventListener("ended", () => { audio.currentTime = 0; });
window.addEventListener("keydown", (event) => { if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName) || $("settings-dialog").open) return; const key = normalizedShortcut(event.key); if (key === settings.shortcuts.playToggle) { event.preventDefault(); togglePlayback(); } else if (key === settings.shortcuts.stamp) { event.preventDefault(); stamp(); } else if (key === settings.shortcuts.playbackEarlier) { event.preventDefault(); seekToTime((audio.currentTime || 0) - adjustmentSeconds()); } else if (key === settings.shortcuts.playbackLater) { event.preventDefault(); seekToTime((audio.currentTime || 0) + adjustmentSeconds()); } });
applySettings(settings); log.info("LyricSync v0.3 initialized. Processing remains local on this device."); render();
