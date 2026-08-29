import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { decodeAudioFile } from "../src/audio-decoder.mjs";
import { parseLyrics } from "../src/lyrics.js";
import { alignWithReferenceTemplates } from "../src/reference-template-aligner.js";

const [targetAudioArg, referenceAudioArg, referenceJsonArg, lyricPathArg, outputArg = "benchmarks/private/reference-template-alignment.json"] = process.argv.slice(2);
if (!targetAudioArg || !referenceAudioArg || !referenceJsonArg || !lyricPathArg) throw new Error("Usage: node scripts/run-reference-template-alignment.mjs <target-audio> <reference-audio> <reference-json> <lyrics> [output-json]");
const targetAudioPath = resolve(targetAudioArg), referenceAudioPath = resolve(referenceAudioArg), referenceJsonPath = resolve(referenceJsonArg), lyricPath = resolve(lyricPathArg), output = resolve(outputArg);
const [target, reference, referenceDocument, lyricsText] = await Promise.all([decodeAudioFile(targetAudioPath), decodeAudioFile(referenceAudioPath), readFile(referenceJsonPath, "utf8").then(JSON.parse), readFile(lyricPath, "utf8")]);
const starts = Array.isArray(referenceDocument) ? referenceDocument : referenceDocument.startTimes || (referenceDocument.lines || []).map((line) => line.startTime);
const lines = parseLyrics(lyricsText, "local_file").lines;
const dtwImplementation = process.env.LYRICSYNC_DTW_IMPLEMENTATION === "banded" ? "banded" : "full-matrix";
const useReferenceAnchors = process.env.LYRICSYNC_REFERENCE_ANCHORS !== "0";
const anchorScale = process.env.LYRICSYNC_REFERENCE_ANCHOR_SCALE === "duration-ratio" ? "duration-ratio" : undefined;
const result = alignWithReferenceTemplates({ referenceSamples: reference.samples, referenceSampleRate: reference.sampleRate, referenceStarts: starts, referenceDuration: reference.duration, targetSamples: target.samples, targetSampleRate: target.sampleRate, targetDuration: target.duration, lyrics: lines, options: { dtwImplementation, useReferenceAnchors, anchorScale } });
const document = { schemaVersion: 1, generatedAt: new Date().toISOString(), privacy: "local paths and generated timeline only; source media and lyrics were not copied", targetAudioPath, referenceAudioPath, referenceJsonPath, lyricPath, result };
await writeFile(output, JSON.stringify(document, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ output, method: result.method, lines: result.lines.length, targetDuration: target.duration, referenceDuration: reference.duration }, null, 2));
