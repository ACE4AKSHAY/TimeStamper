import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createReviewQueue } from "../src/dataset.js";

const manifestPath = resolve(process.argv[2] || "benchmarks/private/local-library.manifest.json");
const outputPath = resolve(process.argv[3] || "benchmarks/private/review-queue.json");
const limit = Number(process.argv[4] || 20);
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const queue = createReviewQueue(manifest.items || [], limit);
await writeFile(outputPath, JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(), instructions: "Complete the review object for each item before using it as benchmark ground truth.", items: queue }, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ outputPath, pendingItems: queue.length }, null, 2));
