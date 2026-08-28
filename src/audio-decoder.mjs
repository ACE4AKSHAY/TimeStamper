import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { extname } from "node:path";

export class AudioDecoderError extends Error {
  constructor(message, code = "AUDIO_DECODER_ERROR") {
    super(message);
    this.name = "AudioDecoderError";
    this.code = code;
  }
}

/**
 * Decode a local audio file to mono Float32 PCM.
 *
 * WAV/PCM is decoded without dependencies. Other formats are sent through an
 * optional local FFmpeg executable; no network or cloud service is involved.
 */
export async function decodeAudioFile(filePath, options = {}) {
  const extension = extname(String(filePath)).toLowerCase();
  const bytes = await readFile(filePath);
  if (extension === ".wav" || extension === ".wave") return decodeWav(bytes);
  const ffmpegPath = options.ffmpegPath || await findExecutable(options.ffmpeg || "ffmpeg");
  if (!ffmpegPath) throw new AudioDecoderError(`No decoder is available for ${extension || "this file"}. WAV/PCM is built in; install or expose FFmpeg for MP3, M4A, FLAC and other formats.`, "DECODER_UNAVAILABLE");
  return decodeWithFfmpeg(filePath, ffmpegPath, options);
}

/** Decode RIFF/WAVE PCM or IEEE-float audio and downmix it to mono. */
export function decodeWav(input) {
  const buffer = Buffer.from(input);
  if (buffer.length < 12 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") throw new AudioDecoderError("Unsupported WAV container; expected RIFF/WAVE.", "INVALID_WAV");
  let offset = 12, format = null, data = null;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString("ascii", offset, offset + 4), size = buffer.readUInt32LE(offset + 4), start = offset + 8;
    const end = Math.min(buffer.length, start + size);
    if (id === "fmt ") {
      if (end - start < 16) throw new AudioDecoderError("WAV fmt chunk is truncated.", "INVALID_WAV");
      format = { audioFormat: buffer.readUInt16LE(start), channels: buffer.readUInt16LE(start + 2), sampleRate: buffer.readUInt32LE(start + 4), blockAlign: buffer.readUInt16LE(start + 12), bitsPerSample: buffer.readUInt16LE(start + 14) };
    } else if (id === "data") data = buffer.subarray(start, end);
    offset = start + size + (size % 2);
  }
  if (!format || !data) throw new AudioDecoderError("WAV must contain fmt and data chunks.", "INVALID_WAV");
  const { audioFormat, channels, sampleRate, blockAlign, bitsPerSample } = format;
  if (![1, 3].includes(audioFormat) || !channels || !sampleRate || !blockAlign) throw new AudioDecoderError("Only PCM integer and IEEE-float WAV files are supported.", "UNSUPPORTED_WAV");
  if (![8, 16, 24, 32, 64].includes(bitsPerSample)) throw new AudioDecoderError(`Unsupported WAV bit depth: ${bitsPerSample}.`, "UNSUPPORTED_WAV");
  const bytesPerSample = Math.ceil(bitsPerSample / 8), frameCount = Math.floor(data.length / blockAlign), samples = new Float32Array(frameCount);
  for (let frame = 0; frame < frameCount; frame++) {
    let sum = 0;
    for (let channel = 0; channel < channels; channel++) {
      const position = frame * blockAlign + channel * bytesPerSample;
      sum += readSample(data, position, audioFormat, bitsPerSample);
    }
    samples[frame] = Math.max(-1, Math.min(1, sum / channels));
  }
  return { samples, sampleRate, channels, sourceChannels: channels, duration: frameCount / sampleRate, format: "wav" };
}

async function decodeWithFfmpeg(filePath, executable, options) {
  const sampleRate = Number(options.sampleRate || 44100);
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) throw new AudioDecoderError("FFmpeg sample rate must be positive.", "INVALID_OPTION");
  const args = ["-v", "error", "-i", filePath, "-f", "f32le", "-ac", "" + (options.channels || 1), "-ar", "" + sampleRate, "pipe:1"];
  const child = spawn(executable, args, { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  const chunks = [], errors = [];
  child.stdout.on("data", (chunk) => chunks.push(chunk)); child.stderr.on("data", (chunk) => errors.push(chunk));
  const exitCode = await new Promise((resolve, reject) => { child.once("error", reject); child.once("close", resolve); });
  if (exitCode !== 0) throw new AudioDecoderError(`FFmpeg could not decode ${filePath}: ${Buffer.concat(errors).toString("utf8").trim() || `exit code ${exitCode}`}`, "FFMPEG_FAILED");
  const raw = Buffer.concat(chunks), samples = new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
  return { samples, sampleRate, channels: options.channels || 1, sourceChannels: null, duration: samples.length / sampleRate, format: "ffmpeg-f32le", decoder: executable };
}

function readSample(data, position, audioFormat, bits) {
  if (audioFormat === 3) return bits === 32 ? data.readFloatLE(position) : data.readDoubleLE(position);
  if (bits === 8) return (data[position] - 128) / 128;
  if (bits === 16) return data.readInt16LE(position) / 32768;
  if (bits === 24) { let value = data[position] | (data[position + 1] << 8) | (data[position + 2] << 16); if (value & 0x800000) value |= 0xff000000; return value / 8388608; }
  return data.readInt32LE(position) / 2147483648;
}

async function findExecutable(command) {
  const lookup = process.platform === "win32" ? "where" : "which";
  return await new Promise((resolve) => { const child = spawn(lookup, [command], { windowsHide: true, stdio: ["ignore", "pipe", "ignore"] }); let output = ""; child.stdout.on("data", (chunk) => { output += chunk; }); child.once("close", (code) => resolve(code === 0 ? output.trim().split(/\r?\n/u)[0] : null)); child.once("error", () => resolve(null)); });
}
