import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ENGINE_REGISTRY, synchronize } from "../src/engine.js";
import { scoreTimestamps, summarizeConfidence } from "../src/metrics.js";

export const EVALUATION_VERSION = 1;

export function buildSyntheticCases() {
  const starts = [2, 7, 13, 20, 28];
  const duration = 36;
  const bins = 720;
  const energy = Array(bins).fill(0.02);
  const voicedness = Array(bins).fill(0.02);
  const spectralFlux = Array(bins).fill(0.01);
  starts.forEach((time) => {
    const center = Math.round((time / duration) * (bins - 1));
    for (let delta = -4; delta <= 4; delta++) {
      const index = center + delta;
      if (index < 0 || index >= bins) continue;
      energy[index] = Math.max(energy[index], 1 - Math.abs(delta) * 0.08);
      voicedness[index] = 1;
      spectralFlux[index] = Math.max(spectralFlux[index], 1 - Math.abs(delta) * 0.08);
    }
  });
  const lines = starts.map((startTime, index) => ({ id: `synthetic-${index}`, text: `line ${index}`, startTime }));
  return [
    {
      id: "synthetic-timed",
      form: "timed",
      duration,
      referenceStarts: starts,
      lines,
      timedLyrics: {
        timedLines: lines.map(({ text, startTime }) => ({ text, startTime, endTime: null, words: [] })),
        timedWords: [],
      },
      profiles: { energy, voicedness, spectralFlux },
    },
    {
      id: "synthetic-plain",
      form: "plain",
      duration,
      referenceStarts: starts,
      lines: lines.map(({ id, text }) => ({ id, text })),
      profiles: { energy, voicedness, spectralFlux },
    },
  ];
}

export function evaluateCases(
  cases = buildSyntheticCases(),
  engines = Array.from(new Set([...Object.keys(ENGINE_REGISTRY), "auto-form"])),
) {
  const caseResults = cases.map((item) => evaluateCase(item, engines));
  const engineResults = {};
  for (const engine of engines) {
    const successful = caseResults.flatMap((item) =>
      item.engines[engine]?.status === "evaluated" ? [item.engines[engine]] : [],
    );
    if (!successful.length) {
      engineResults[engine] = { status: "not_evaluated", caseCount: 0, reason: "no compatible synthetic result" };
      continue;
    }
    const errors = successful.flatMap((item) => item.metrics.errorsSeconds);
    const aggregate = scoreTimestamps(
      errors,
      errors.map(() => 0),
    );
    engineResults[engine] = {
      status: "evaluated",
      caseCount: successful.length,
      lineCount: errors.length,
      maeSeconds: aggregate.maeSeconds,
      medianAbsoluteErrorSeconds: aggregate.medianAbsoluteErrorSeconds,
      within025: aggregate.within025,
      within050: aggregate.within050,
      within100: aggregate.within100,
      meanRuntimeMs: successful.reduce((sum, item) => sum + item.runtimeMs, 0) / successful.length,
      confidence: successful[0].confidence || null,
    };
  }
  const routerComparisons = caseResults.map((item) => {
    const evaluated = Object.entries(item.engines).filter(([, result]) => result.status === "evaluated");
    const best = evaluated.sort((left, right) => left[1].metrics.maeSeconds - right[1].metrics.maeSeconds)[0];
    return {
      caseId: item.id,
      autoFormMaeSeconds: item.engines["auto-form"]?.metrics?.maeSeconds ?? null,
      bestSingleEngine: best?.[0] || null,
      bestSingleMaeSeconds: best?.[1]?.metrics?.maeSeconds ?? null,
      oracleMaeSeconds: best?.[1]?.metrics?.maeSeconds ?? null,
    };
  });
  return {
    schemaVersion: EVALUATION_VERSION,
    dataset: "synthetic-regression-corpus",
    realAccuracyClaim: false,
    notes: [
      "Synthetic cases validate plumbing and regressions only.",
      "Real-song metrics require verified reference.json cases.",
    ],
    engineResults,
    routerComparisons,
    cases: caseResults,
  };
}

export function formatEvaluationMarkdown(report) {
  const rows = Object.entries(report.engineResults).map(([engine, result]) =>
    result.status === "evaluated"
      ? `| ${engine} | ${result.caseCount} | ${result.maeSeconds.toFixed(3)} | ${(result.within050 * 100).toFixed(1)}% | ${result.meanRuntimeMs.toFixed(2)} |`
      : `| ${engine} | 0 | n/a | n/a | n/a |`,
  );
  return [
    "# LyricSync evaluation",
    "",
    `Dataset: **${report.dataset}** (real accuracy claim: **${report.realAccuracyClaim ? "yes" : "no"}**)`,
    "",
    "| Engine | Cases | MAE (s) | Within 500 ms | Mean runtime (ms) |",
    "| --- | ---: | ---: | ---: | ---: |",
    ...rows,
    "",
    "## Router comparisons",
    "",
    "| Case | Auto-form MAE (s) | Best single engine | Best single MAE (s) |",
    "| --- | ---: | --- | ---: |",
    ...report.routerComparisons.map(
      (item) =>
        `| ${item.caseId} | ${item.autoFormMaeSeconds ?? "n/a"} | ${item.bestSingleEngine || "n/a"} | ${item.bestSingleMaeSeconds ?? "n/a"} |`,
    ),
    "",
    ...report.notes.map((note) => `- ${note}`),
    "",
  ].join("\n");
}

function evaluateCase(item, engines) {
  const output = { id: item.id, form: item.form, referenceStarts: item.referenceStarts, engines: {} };
  for (const engine of engines) {
    const started = performance.now();
    try {
      const result = synchronize({
        lyrics: item.lines,
        duration: item.duration,
        engine,
        parameters: {
          profiles: item.profiles,
          profile: item.profiles.energy,
          timedLyrics: item.timedLyrics,
          structureAware: true,
          budgetMs: 1000,
        },
      });
      const predicted = result.lines.map((line) => line.startTime);
      if (predicted.some((value) => !Number.isFinite(value))) throw new Error("engine returned unset timestamps");
      const metrics = scoreTimestamps(predicted, item.referenceStarts);
      const confidences = result.lines.map((line) => (Number.isFinite(line.confidence) ? line.confidence : 0));
      output.engines[engine] = {
        status: "evaluated",
        predicted,
        metrics,
        runtimeMs: performance.now() - started,
        confidence: summarizeConfidence(predicted, item.referenceStarts, confidences),
      };
    } catch (error) {
      output.engines[engine] = {
        status: "not_evaluated",
        reason: error.message || String(error),
        runtimeMs: performance.now() - started,
      };
    }
  }
  return output;
}

async function main() {
  const outputPath = resolve(process.argv[2] || "benchmarks/results/evaluation.json");
  const markdownPath = resolve(process.argv[3] || "benchmarks/results/evaluation.md");
  const report = evaluateCases();
  await mkdir(dirname(outputPath), { recursive: true });
  await mkdir(dirname(markdownPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(report, null, 2) + "\n", "utf8");
  await writeFile(markdownPath, formatEvaluationMarkdown(report), "utf8");
  console.log(
    JSON.stringify(
      { outputPath, markdownPath, engines: Object.keys(report.engineResults).length, dataset: report.dataset },
      null,
      2,
    ),
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
