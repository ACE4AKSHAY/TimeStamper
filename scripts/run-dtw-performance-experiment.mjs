import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { constrainedDtw } from "../src/dtw.js";
import { constrainedDtwBanded } from "../src/dtw-banded.js";

const outputPath = process.argv[2] || "benchmarks/results/dtw-performance-study.json";
const lengths = [64, 128, 256];
const dimensions = 6;
const window = 12;
const methods = { fullMatrix: constrainedDtw, rollingCost: constrainedDtwBanded };
const cases = [];
for (const length of lengths) {
  const left = Array.from({ length }, (_, row) => Array.from({ length: dimensions }, (_, dimension) => Math.sin((row + 1) * (dimension + 2) / 17)));
  const right = Array.from({ length }, (_, row) => Array.from({ length: dimensions }, (_, dimension) => Math.sin((row + 2) * (dimension + 2) / 17)));
  const result = { length, methods: {} };
  for (const [name, method] of Object.entries(methods)) {
    const started = performance.now();
    const value = method(left, right, { window });
    result.methods[name] = { runtimeMs: performance.now() - started, cost: value.cost, pathLength: value.path.length };
  }
  result.equivalent = result.methods.fullMatrix.cost === result.methods.rollingCost.cost && result.methods.fullMatrix.pathLength === result.methods.rollingCost.pathLength;
  cases.push(result);
}
const output = { datasetVersion: "dtw-memory-optimization-synthetic-v1", description: "Reference full-matrix constrained DTW versus rolling-cost banded DTW; exact path/cost equivalence is required before integration.", window, dimensions, cases, generatedAt: new Date().toISOString() };
await mkdir(dirname(resolve(outputPath)), { recursive: true });
await writeFile(resolve(outputPath), JSON.stringify(output, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ output: outputPath, cases: cases.map(({ length, equivalent, methods: values }) => ({ length, equivalent, fullMatrixMs: values.fullMatrix.runtimeMs, rollingCostMs: values.rollingCost.runtimeMs })) }, null, 2));
