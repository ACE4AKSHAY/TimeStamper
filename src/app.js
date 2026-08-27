import { createLine, createProject } from "./domain.js";
import { parseLyrics, linesToText } from "./lyrics.js";
import { exportLrc, secondsToLrc } from "./lrc.js";
import { deserializeProject, downloadText, openText, saveText, serializeProject } from "./storage.js";
import { ProjectLogger } from "./logger.js";
import { DEFAULT_SETTINGS, applySettings, loadSettings, saveSettings } from "./settings.js";
import { createEnergyInitialTimeline } from "./energy-aligner.js";

const $ = (id) => document.getElementById(id);
let project = createProject(); let audioUrl = null; let selectedId = null; let peaks = []; let energyProfile = []; let waveformDragging = false; let scanTimer = null; let scanWasPlaying = false; let settings = loadSettings();
const log = new ProjectLogger(renderLog); const audio = $("audio");
const timelineLines = () => project.timeline.lines;
const timestamp = (time) => Number.isFinite(time) ? secondsToLrc(time) : "—";
const safeName = (value) => (value || "lyricsync-project").replace(/[<>:"/\\|?*]+/gu, "-").trim() || "lyricsync-project";

function formatClock(seconds) {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const hours = Math.floor(safe / 3600), minutes = Math.floor(safe / 60) % 60, wholeSeconds = Math.floor(safe) % 60, milliseconds = Math.floor((safe % 1) * 1000);
  return `${hours ? `${String(hours).padStart(2, "0")}:` : ""}${String(minutes).padStart(2, "0")}:${String(wholeSeconds).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`;
}

function parseEditorTime(value) {
  const text = String(value).trim().replace(/^\[/u, "").replace(/\]$/u, "");
  if (!text) return null;
  const parts = text.split(":");
  if (parts.length > 3 || parts.some((part) => !/^\d+(?:\.\d+)?$/u.test(part))) return null;
  const values = parts.map(Number);
  const seconds = values.length === 3 ? values[0] * 3600 + values[1] * 60 + values[2] : values.length === 2 ? values[0] * 60 + values[1] : values[0];
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}

function activeStampTime() { const typed = $("stamp-time").value.trim(); return typed ? parseEditorTime(typed) : audio.currentTime; }
function adjustmentSeconds() { return Math.max(0.001, Number($("adjust-ms").value) / 1000 || 0.1); }
function updateMetadata() { ["title", "artist", "album", "language"].forEach((key) => { project.metadata[key] = $(key).value.trim(); }); }

function render() {
  ["title", "artist", "album", "language"].forEach((key) => { $(key).value = project.metadata[key] || ""; });
  $("lyrics-text").value = linesToText(project.lyrics.lines);
  $("lyrics-status").textContent = `${project.lyrics.lines.length} lyric line(s) loaded`;
  $("audio-status").textContent = project.audio.name ? `${project.audio.name}${project.audio.duration ? ` · ${formatClock(project.audio.duration)}` : ""}` : "No audio selected";
  const enabled = Boolean(project.audio.name);
  ["reset-audio", "rewind", "play-toggle", "fast-forward", "seek", "jump-to-time", "stamp", "shift-earlier", "shift-later"].forEach((id) => { $(id).disabled = !enabled; });
  $("auto-timestamp").disabled = !enabled || !timelineLines().length || !energyProfile.length;
  renderTimeline(); renderWaveform(); updatePositionDisplays();
}

function renderTimeline() {
  $("timeline").replaceChildren(...timelineLines().map((line, index) => {
    const tr = document.createElement("tr"); tr.className = line.id === selectedId ? "selected" : "";
    tr.innerHTML = `<td>${index + 1}</td><td><input class="time-input" aria-label="Timestamp for line ${index + 1}" value="${Number.isFinite(line.startTime) ? formatClock(line.startTime) : ""}" placeholder="mm:ss.mmm"></td><td class="line-text"></td><td class="row-actions"><button aria-label="Stamp chosen time" title="Stamp chosen time">⏱</button> <button aria-label="Clear timestamp" title="Clear timestamp">⌫</button> <button aria-label="Insert empty line after" title="Insert empty line after">＋</button> <button aria-label="Duplicate line" title="Duplicate line">⧉</button></td>`;
    tr.querySelector(".line-text").textContent = line.originalText;
    tr.addEventListener("click", (event) => { if (!event.target.matches("input,button")) { selectedId = line.id; renderTimeline(); } });
    tr.querySelector(".line-text").addEventListener("click", () => { selectedId = line.id; renderTimeline(); });
    tr.querySelector("input").addEventListener("change", (event) => setTimestamp(line, event.target.value));
    tr.querySelectorAll("button")[0].addEventListener("click", () => stamp(line));
    tr.querySelectorAll("button")[1].addEventListener("click", () => { line.startTime = null; line.manuallyCorrected = true; log.info(`Cleared timestamp for line ${index + 1}`); render(); });
    tr.querySelectorAll("button")[2].addEventListener("click", () => insertLineAfter(index, ""));
    tr.querySelectorAll("button")[3].addEventListener("click", () => insertLineAfter(index, line.originalText, line.startTime));
    return tr;
  }));
}

function insertLineAfter(index, text, startTime = null) {
  const line = createLine(text, index + 1); line.startTime = startTime; line.source = "manual"; line.manuallyCorrected = true;
  timelineLines().splice(index + 1, 0, line); timelineLines().forEach((item, order) => { item.order = order; }); project.lyrics.lines = timelineLines(); selectedId = line.id;
  log.info(text ? `Duplicated line ${index + 1}.` : `Inserted empty line after line ${index + 1}.`); render();
}

function setTimestamp(line, value) {
  const seconds = parseEditorTime(value);
  if (seconds === null) { log.warning(`Invalid timestamp “${value}”. Use mm:ss.mmm, hh:mm:ss.mmm, or seconds.`); renderTimeline(); return; }
  line.startTime = seconds; line.manuallyCorrected = true; selectedId = line.id; log.info(`Set timestamp for line ${line.order + 1} to ${formatClock(seconds)}`); render();
}

function stamp(line = timelineLines().find((item) => item.id === selectedId)) {
  if (!line) { log.warning("Select a lyric line before stamping."); return; }
  const time = activeStampTime();
  if (time === null) { log.warning("The stamp time is invalid. Use mm:ss.mmm, hh:mm:ss.mmm, or seconds."); return; }
  const currentIndex = timelineLines().indexOf(line);
  line.startTime = Math.min(time, audio.duration || time); line.manuallyCorrected = true; selectedId = timelineLines()[currentIndex + 1]?.id || line.id; log.info(`Stamped line ${line.order + 1} at ${formatClock(line.startTime)}${selectedId !== line.id ? "; selected the next line." : ""}`); render();
}

function shiftSelected(direction) {
  const line = timelineLines().find((item) => item.id === selectedId);
  if (!line || !Number.isFinite(line.startTime)) { log.warning("Select a timestamped line to adjust it."); return; }
  const delta = direction * adjustmentSeconds(); line.startTime = Math.max(0, line.startTime + delta); line.manuallyCorrected = true; log.info(`Adjusted line ${line.order + 1} by ${Math.round(delta * 1000)} ms`); render();
}

function createInitialTiming() {
  if (!energyProfile.length) { log.warning("Wait for the waveform and energy profile to finish loading."); return; }
  project.timeline.lines = createEnergyInitialTimeline(timelineLines(), energyProfile, audio.duration); project.lyrics.lines = project.timeline.lines;
  selectedId = timelineLines()[0]?.id || null; log.info("Generated editable energy-based initial timestamps. Review every line before export."); render();
}

async function loadAudio(file) {
  if (audioUrl) URL.revokeObjectURL(audioUrl); audioUrl = URL.createObjectURL(file); audio.src = audioUrl;
  project.audio = { name: file.name, type: file.type, duration: null, sourceHint: "Select this audio file again after reopening the project." }; log.info(`Audio selected: ${file.name}`); render();
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
$("load-lyrics").addEventListener("click", () => loadLyrics($("lyrics-text").value)); $("clear-timestamps").addEventListener("click", () => { timelineLines().forEach((line) => { line.startTime = null; }); log.info("Cleared all timestamps."); render(); });
$("play-toggle").addEventListener("click", togglePlayback); $("seek").addEventListener("input", (event) => { const seconds = Number(event.target.value); audio.currentTime = seconds; updatePositionDisplays(seconds); renderWaveform(); });
$("reset-audio").addEventListener("click", resetAudio); ["pointerup", "pointerleave", "pointercancel"].forEach((eventName) => $("rewind").addEventListener(eventName, () => stopScan(-1))); $("rewind").addEventListener("pointerdown", () => startScan(-1)); ["pointerup", "pointerleave", "pointercancel"].forEach((eventName) => $("fast-forward").addEventListener(eventName, () => stopScan(1))); $("fast-forward").addEventListener("pointerdown", () => startScan(1));
$("jump-to-time").addEventListener("click", () => { const seconds = parseEditorTime($("jump-time").value); if (seconds === null) { log.warning("The Go to time value is invalid."); return; } audio.currentTime = Math.min(seconds, audio.duration || seconds); updatePositionDisplays(); renderWaveform(); });
$("stamp").addEventListener("click", () => stamp()); $("shift-earlier").addEventListener("click", () => shiftSelected(-1)); $("shift-later").addEventListener("click", () => shiftSelected(1));
$("auto-timestamp").addEventListener("click", createInitialTiming);
$("waveform").addEventListener("pointerdown", (event) => { waveformDragging = true; $("waveform").setPointerCapture(event.pointerId); seekFromWaveform(event); }); $("waveform").addEventListener("pointermove", (event) => { seekFromWaveform(event, waveformDragging); }); $("waveform").addEventListener("pointerup", (event) => { waveformDragging = false; $("waveform").releasePointerCapture(event.pointerId); $("waveform-tooltip").classList.remove("visible"); }); $("waveform").addEventListener("pointerleave", () => { if (!waveformDragging) $("waveform-tooltip").classList.remove("visible"); });
$("new-project").addEventListener("click", () => { if (confirm("Start a new project? Unsaved changes will be lost.")) { project = createProject(); selectedId = null; peaks = []; energyProfile = []; audio.removeAttribute("src"); log.info("New project created."); render(); } });
$("save-project").addEventListener("click", async () => { updateMetadata(); const result = await saveText(serializeProject(project), `${safeName(project.metadata.title)}.lyricsync.json`, "application/json", [{ name: "LyricSync project", extensions: ["json"] }]); if (!result.canceled) log.info(result.path ? `Project saved: ${result.path}` : "Project file downloaded."); });
$("export-lrc").addEventListener("click", async () => { updateMetadata(); const count = timelineLines().filter((line) => Number.isFinite(line.startTime)).length; if (!count) { log.warning("No timestamps to export."); return; } const result = await saveText(exportLrc(project), `${safeName(project.metadata.title)}.lrc`, "text/plain;charset=utf-8", [{ name: "LRC lyrics", extensions: ["lrc"] }]); if (!result.canceled) log.info(result.path ? `LRC exported: ${result.path}` : `Exported ${count} timestamped line(s) as LRC.`); });
$("open-project").addEventListener("click", async () => { const desktopFile = await openText([{ name: "LyricSync project", extensions: ["json"] }]); if (!desktopFile) { if (!window.lyricSyncDesktop) $("project-file").click(); return; } try { project = deserializeProject(desktopFile.content); selectedId = project.timeline.lines[0]?.id || null; peaks = []; log.info(`Opened project: ${desktopFile.path}. Re-select the audio file to play it.`); render(); } catch (error) { log.error(error.message); alert(error.message); } });
$("project-file").addEventListener("change", async (event) => { const file = event.target.files[0]; if (!file) return; try { project = deserializeProject(await file.text()); selectedId = project.timeline.lines[0]?.id || null; peaks = []; log.info(`Opened project: ${file.name}. Re-select the audio file to play it.`); render(); } catch (error) { log.error(error.message); alert(error.message); } }); $("download-log").addEventListener("click", () => downloadText(log.text(), "lyricsync.log", "text/plain;charset=utf-8"));
$("open-settings").addEventListener("click", () => { $("theme-setting").value = settings.theme; $("waveform-color-setting").value = settings.waveformColor; $("text-scale-setting").value = settings.textScale; $("settings-dialog").showModal(); });
$("save-settings").addEventListener("click", () => { settings = { theme: $("theme-setting").value, waveformColor: $("waveform-color-setting").value, textScale: $("text-scale-setting").value }; saveSettings(settings); applySettings(settings); renderWaveform(); log.info("General settings saved locally."); });
$("reset-settings").addEventListener("click", () => { settings = { ...DEFAULT_SETTINGS }; $("theme-setting").value = settings.theme; $("waveform-color-setting").value = settings.waveformColor; $("text-scale-setting").value = settings.textScale; applySettings(settings); renderWaveform(); });
audio.addEventListener("loadedmetadata", () => { project.audio.duration = audio.duration; $("seek").max = audio.duration; log.info(`Audio duration: ${audio.duration.toFixed(3)} seconds.`); render(); }); audio.addEventListener("timeupdate", () => { updatePositionDisplays(); renderWaveform(); }); audio.addEventListener("play", () => setPlayButton(true)); audio.addEventListener("pause", () => setPlayButton(false)); audio.addEventListener("ended", () => { audio.currentTime = 0; });
window.addEventListener("keydown", (event) => { if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName) || $("settings-dialog").open) return; if (event.key === " ") { event.preventDefault(); togglePlayback(); } if (event.key.toLowerCase() === "t") { event.preventDefault(); stamp(); } if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); const delta = event.key === "ArrowLeft" ? -adjustmentSeconds() : adjustmentSeconds(); audio.currentTime = Math.max(0, Math.min(audio.duration || Infinity, audio.currentTime + delta)); } });
applySettings(settings); log.info("LyricSync v0.2 initialized. Processing remains local on this device."); render();
