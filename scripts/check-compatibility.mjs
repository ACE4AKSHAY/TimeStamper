import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const packageJson = JSON.parse(await readFile(resolve("package.json"), "utf8"));
const portableModules = [
  "domain.js", "lyrics.js", "lrc.js", "energy-aligner.js", "features.js", "dtw.js",
  "mfcc-dtw.js", "template-aligner.js", "template-builder.js", "profile-fusion.js",
  "audio-profiles.js", "pitch-profile.js", "combined-aligner.js", "boundary-dp-aligner.js",
  "intro-aware-aligner.js", "adaptive-boundary-aligner.js", "text-weighted-aligner.js", "multi-profile-aligner.js", "consensus-aligner.js",
  "engine.js", "metrics.js",
];
const forbiddenImport = /(?:from\s+["']node:|import\s*\(["']node:|require\s*\(["']node:)/u;

if (packageJson.type !== "module") throw new Error("package.json must keep type=module for the reusable ES modules.");
if (!/^>=18(?:\.0\.0)?$/.test(packageJson.engines?.node || "")) throw new Error("package.json must declare Node >=18 compatibility.");

for (const file of portableModules) {
  const source = await readFile(resolve("src", file), "utf8");
  if (forbiddenImport.test(source)) throw new Error(`Portable module imports a Node-only API: src/${file}`);
  await import(pathToFileURL(resolve("src", file)).href);
}

const { synchronize } = await import(pathToFileURL(resolve("src/engine.js")).href);
const lines = ["తెలుగు", "हिन्दी", "English"].map((originalText, order) => ({ id: `compat-${order}`, originalText, order }));
const profile = Array.from({ length: 1200 }, (_, index) => 0.1 + (index % 37) / 100);
const result = synchronize({ lyrics: lines, energyProfile: profile, duration: 120 });
if (result.lines.length !== lines.length || result.lines.some((line, index) => index && line.startTime < result.lines[index - 1].startTime)) throw new Error("Compatibility smoke alignment was not monotonic.");
console.log(JSON.stringify({ node: process.version, moduleCount: portableModules.length, engine: result.engine, unicodeLines: result.lines.length, status: "compatible" }, null, 2));
