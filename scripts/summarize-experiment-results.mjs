import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const outputPath = resolve(process.argv[2] || "benchmarks/results/RESULTS_SUMMARY.md");

const definitions = [
  ["Energy baseline", "benchmarks/results/energy-baseline.json", (data) => metricSummary(data.metrics)],
  [
    "Energy vs combined profile",
    "benchmarks/results/engine-comparison.json",
    (data) => `energy ${data.methods.energyBaseline.metrics.maeSeconds.toFixed(3)} s MAE; combined ${data.methods.combinedProfile.metrics.maeSeconds.toFixed(3)} s MAE`,
  ],
  ["Template MFCC + constrained DTW", "benchmarks/results/template-mfcc-dtw.json", (data) => metricSummary(data.metrics)],
  ["Boundary dynamic programming", "benchmarks/results/boundary-dp.json", (data) => metricSummary(data.metrics)],
  [
    "Autocorrelation pitch",
    "benchmarks/results/pitch-profile.json",
    (data) => `${data.metrics.voicedFrequencyMaeHz.toFixed(3)} Hz voiced MAE; ${(1 - data.metrics.silenceFalseVoicedRate) * 100}% silence specificity`,
  ],
  ["Multi-profile boundary DP", "benchmarks/results/multi-profile-boundary-dp.json", (data) => metricSummary(data.metrics)],
  ["Robustness perturbation sweep", "benchmarks/results/robustness-study.json", (data) => Object.entries(data.metrics).map(([name, metrics]) => `${name}: ${metrics.maeSeconds.toFixed(3)} s MAE`).join("; ")],
  ["Parameter sensitivity sweep", "benchmarks/results/parameter-sweep.json", (data) => Object.entries(data.results).map(([name, result]) => `${name}: ${result.best.metrics.maeSeconds.toFixed(3)} s best MAE`).join("; ")],
  [
    "Common ablation",
    "benchmarks/results/ablation-study.json",
    (data) => Object.entries(data.metrics).map(([name, metrics]) => `${name}: ${metrics.maeSeconds.toFixed(3)} s MAE`).join("; "),
  ],
];

const rows = [];
for (const [name, relativePath, summarize] of definitions) {
  try {
    const data = JSON.parse(await readFile(resolve(relativePath), "utf8"));
    rows.push(`| ${name} | ${data.datasetVersion} | ${data.caseCount ?? data.scenarios ?? "—"} | ${summarize(data)} |`);
  } catch (error) {
    rows.push(`| ${name} | — | — | Not generated (${error.code === "ENOENT" ? "run its experiment first" : "invalid JSON"}) |`);
  }
}

const report = [
  "# Experiment results summary",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  "This report is generated from the ignored JSON outputs under `benchmarks/results/`.",
  "",
  "## Current measurements",
  "",
  "| Experiment | Fixture | Cases | Result |",
  "| --- | --- | ---: | --- |",
  ...rows,
  "",
  "## What these numbers mean",
  "",
  "All rows above are deterministic synthetic fixtures. They validate feature extraction, engine wiring, metrics, and reproducibility; they do not demonstrate accuracy on a sung recording. The template-DTW and boundary-DP zero-error rows are expected because their fixtures contain clean, known boundaries.",
  "",
  "No real-song accuracy result exists yet. The private collection has not been used as ground truth because compressed-file decoding still needs local FFmpeg (or WAV input), and an automatically downloaded LRC is not a verified reference. A trustworthy real result requires manually checking the song/lyrics pair and line starts first.",
  "",
  "## Reproduce",
  "",
  "```powershell",
  "$env:Path = 'C:\\Users\\aksha\\AppData\\Local\\nvm\\v22.23.2;' + $env:Path",
  "npm run compare-engines",
  "npm run experiment-template-dtw",
  "npm run experiment-boundary-dp",
  "npm run experiment-pitch",
  "npm run experiment-multi-profile",
  "npm run ablation-study",
  "npm run summarize-experiments",
  "```",
  "",
].join("\n");

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, report, "utf8");
console.log(`Wrote ${outputPath}`);

function metricSummary(metrics) {
  return `${metrics.maeSeconds.toFixed(3)} s MAE; ${metrics.medianAbsoluteErrorSeconds.toFixed(3)} s median; ${(metrics.within100 * 100).toFixed(0)}% within 1.00 s`;
}
