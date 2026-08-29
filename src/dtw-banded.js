import { euclideanDistance } from "./dtw.js";

/**
 * Memory-efficient constrained DTW. Costs are kept for only the previous and
 * current row; one-byte parent directions are retained for path reconstruction.
 * Tie-breaking matches constrainedDtw: diagonal, then up, then left.
 */
export function constrainedDtwBanded(sequenceA, sequenceB, options = {}) {
  if (!Array.isArray(sequenceA) || !Array.isArray(sequenceB) || !sequenceA.length || !sequenceB.length) throw new Error("DTW requires two non-empty feature sequences.");
  const rows = sequenceA.length;
  const columns = sequenceB.length;
  const window = Number.isFinite(options.window) ? Math.max(Math.abs(rows - columns), Math.floor(options.window)) : Math.max(rows, columns);
  const distance = options.distance || euclideanDistance;
  let previous = new Float64Array(columns + 1).fill(Infinity);
  let current = new Float64Array(columns + 1).fill(Infinity);
  const parents = Array.from({ length: rows + 1 }, () => new Int8Array(columns + 1));
  previous[0] = 0;
  for (let row = 1; row <= rows; row++) {
    current.fill(Infinity);
    const firstColumn = Math.max(1, row - window);
    const lastColumn = Math.min(columns, row + window);
    for (let column = firstColumn; column <= lastColumn; column++) {
      let best = previous[column - 1];
      let direction = 1;
      if (previous[column] < best) { best = previous[column]; direction = 2; }
      if (current[column - 1] < best) { best = current[column - 1]; direction = 3; }
      if (!Number.isFinite(best)) continue;
      current[column] = distance(sequenceA[row - 1], sequenceB[column - 1]) + best;
      parents[row][column] = direction;
    }
    const swap = previous;
    previous = current;
    current = swap;
  }
  const cost = previous[columns];
  if (!Number.isFinite(cost)) throw new Error("No valid DTW path under the selected window constraint.");
  const path = [];
  let row = rows;
  let column = columns;
  while (row || column) {
    path.push([row - 1, column - 1]);
    const parent = parents[row][column];
    if (parent === 1) { row--; column--; }
    else if (parent === 2) row--;
    else if (parent === 3) column--;
    else throw new Error("DTW path reconstruction failed.");
  }
  path.reverse();
  return { path, cost, normalizedCost: cost / path.length, window };
}
