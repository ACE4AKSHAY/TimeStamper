export function euclideanDistance(a, b) {
  const length = Math.min(a.length, b.length); let sum = 0;
  for (let i = 0; i < length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum + Math.abs(a.length - b.length));
}

export function constrainedDtw(sequenceA, sequenceB, options = {}) {
  if (!Array.isArray(sequenceA) || !Array.isArray(sequenceB) || !sequenceA.length || !sequenceB.length) throw new Error("DTW requires two non-empty feature sequences.");
  const rows = sequenceA.length, columns = sequenceB.length, window = Number.isFinite(options.window) ? Math.max(Math.abs(rows - columns), Math.floor(options.window)) : Math.max(rows, columns), distance = options.distance || euclideanDistance;
  const costs = Array.from({ length: rows + 1 }, () => new Float64Array(columns + 1).fill(Infinity)); const parents = Array.from({ length: rows + 1 }, () => new Int8Array(columns + 1)); costs[0][0] = 0;
  for (let row = 1; row <= rows; row++) for (let column = Math.max(1, row - window); column <= Math.min(columns, row + window); column++) { const candidates = [[costs[row - 1][column - 1], 1], [costs[row - 1][column], 2], [costs[row][column - 1], 3]]; candidates.sort((a, b) => a[0] - b[0]); costs[row][column] = distance(sequenceA[row - 1], sequenceB[column - 1]) + candidates[0][0]; parents[row][column] = candidates[0][1]; }
  if (!Number.isFinite(costs[rows][columns])) throw new Error("No valid DTW path under the selected window constraint.");
  const path = []; let row = rows, column = columns; while (row || column) { path.push([row - 1, column - 1]); const parent = parents[row][column]; if (parent === 1) { row--; column--; } else if (parent === 2) row--; else if (parent === 3) column--; else throw new Error("DTW path reconstruction failed."); }
  path.reverse(); return { path, cost: costs[rows][columns], normalizedCost: costs[rows][columns] / path.length, window };
}
