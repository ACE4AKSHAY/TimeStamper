import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const packageJson = JSON.parse(await readFile(resolve("package.json"), "utf8"));
const electronPackage = JSON.parse(await readFile(resolve("node_modules/electron/package.json"), "utf8"));
const nodeMajor = Number(process.versions.node.split(".")[0]);
const ffmpegResult = spawnSync(process.env.LYRICSYNC_FFMPEG || "ffmpeg", ["-version"], { stdio: "ignore", windowsHide: true });
const configuredFfmpeg = process.env.LYRICSYNC_FFMPEG || null;
const ffmpegAvailable = ffmpegResult.status === 0 || Boolean(configuredFfmpeg && existsSync(configuredFfmpeg));
const report = {
  node: process.version,
  nodeRequirement: packageJson.engines?.node || null,
  electron: electronPackage.version,
  ffmpeg: { available: ffmpegAvailable, configuredPath: configuredFfmpeg },
  offlineCore: "ready",
  status: nodeMajor >= 18 && electronPackage.version === packageJson.devDependencies.electron.replace(/^\^/u, "") ? "compatible" : "review-required",
};
console.log(JSON.stringify(report, null, 2));
if (report.status !== "compatible") process.exitCode = 1;
