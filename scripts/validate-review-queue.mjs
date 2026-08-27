import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { validateReviewQueue } from "../src/dataset.js";

const inputPath = resolve(process.argv[2] || "benchmarks/private/review-queue.json");
const outputPath = resolve(process.argv[3] || "benchmarks/private/approved-dataset.json");
const queue = JSON.parse(await readFile(inputPath, "utf8"));
const result = validateReviewQueue(queue.items || []);
await writeFile(outputPath, JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(), instructions: "Only entries with reviewStatus approved and benchmarkReady true can be used as ground truth.", summary: result.summary, approved: result.approved, pending: result.pending, rejected: result.rejected }, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ outputPath, summary: result.summary }, null, 2));
