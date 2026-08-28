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
  ["Seeded generalization corpus", "benchmarks/results/generalization-study.json", (data) => Object.entries(data.metrics).map(([name, metrics]) => `${name}: ${metrics.maeSeconds.toFixed(3)} s MAE`).join("; ")],
  ["Intro-aware Boundary-DP", "benchmarks/results/intro-aware-study.json", (data) => Object.entries(data.metrics).map(([name, metrics]) => `${name}: ${metrics.maeSeconds.toFixed(3)} s MAE`).join("; ")],
  ["Adaptive Boundary-DP", "benchmarks/results/adaptive-boundary-study.json", (data) => Object.entries(data.metrics).map(([name, metrics]) => `${name}: ${metrics.maeSeconds.toFixed(3)} s MAE`).join("; ")],
  ["Consensus confidence", "benchmarks/results/consensus-study.json", (data) => `${data.metrics.maeSeconds.toFixed(3)} s MAE; high ${data.confidenceBuckets.high}; medium ${data.confidenceBuckets.medium}; low ${data.confidenceBuckets.low}`],
  ["Template-DTW tempo robustness", "benchmarks/results/template-tempo-study.json", (data) => Object.entries(data.results).map(([name, result]) => `${name}: ${result.metrics.maeSeconds.toFixed(3)} s MAE`).join("; ")],
  ["Template-DTW noise robustness", "benchmarks/results/template-noise-study.json", (data) => Object.entries(data.results).map(([name, result]) => `${name}: ${result.metrics.maeSeconds.toFixed(3)} s MAE`).join("; ")],
  ["MFCC parameter sensitivity", "benchmarks/results/mfcc-parameter-study.json", (data) => `best ${data.best.metrics.maeSeconds.toFixed(3)} s MAE; worst ${data.worst.metrics.maeSeconds.toFixed(3)} s MAE across ${data.candidateCount} settings`],
  ["Text-weighted Boundary-DP", "benchmarks/results/text-weighted-boundary-study.json", (data) => `equal-duration ${data.methods.boundaryDp.metrics.maeSeconds.toFixed(3)} s MAE; text-weighted ${data.methods.textWeightedBoundaryDp.metrics.maeSeconds.toFixed(3)} s MAE; ${(data.methods.textWeightedBoundaryDp.metrics.within100 * 100).toFixed(0)}% within 1.00 s`],
  ["Boundary refinement", "benchmarks/results/boundary-refinement-study.json", (data) => `adaptive coarse ${data.methods.adaptiveBoundaryDp.metrics.maeSeconds.toFixed(3)} s MAE; refined ${data.methods.refinedBoundaryDp.metrics.maeSeconds.toFixed(3)} s MAE; ${(data.methods.refinedBoundaryDp.metrics.within050 * 100).toFixed(0)}% within 0.50 s`],
  ["Boundary ensemble", "benchmarks/results/ensemble-boundary-study.json", (data) => `adaptive ${data.methods.adaptiveBoundaryDp.metrics.maeSeconds.toFixed(3)} s MAE; refined ${data.methods.refinedBoundaryDp.metrics.maeSeconds.toFixed(3)} s MAE; consensus ${data.methods.ensembleBoundary.metrics.maeSeconds.toFixed(3)} s MAE; ${(data.methods.ensembleBoundary.metrics.within100 * 100).toFixed(0)}% within 1.00 s`],
  ["Vocal-gated Boundary-DP", "benchmarks/results/vocal-gated-boundary-study.json", (data) => `energy-only ${data.methods.energyAdaptiveBoundaryDp.metrics.maeSeconds.toFixed(3)} s MAE; vocal-gated ${data.methods.vocalGatedBoundaryDp.metrics.maeSeconds.toFixed(3)} s MAE; ${(data.methods.vocalGatedBoundaryDp.metrics.within050 * 100).toFixed(0)}% within 0.50 s`],
  ["Adaptive vocal selector", "benchmarks/results/adaptive-vocal-boundary-study.json", (data) => `energy-only ${data.methods.energyAdaptiveBoundaryDp.metrics.maeSeconds.toFixed(3)} s MAE; routed ${data.methods.adaptiveVocalBoundaryDp.metrics.maeSeconds.toFixed(3)} s MAE; coverage-based gate/fallback`],
  ["Offline pipeline smoke", "benchmarks/results/offline-pipeline-smoke.json", (data) => `${data.metrics.maeSeconds.toFixed(3)} s MAE; ${data.decoder.samples} decoded samples; ${data.profiles.energyFrames} profile frames`],
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
  "npm run experiment-text-weighted",
  "npm run experiment-boundary-refinement",
  "npm run experiment-ensemble",
  "npm run experiment-vocal-gated",
  "npm run experiment-adaptive-vocal",
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
