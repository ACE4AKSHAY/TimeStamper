/**
 * Pure-JS CTC forced-alignment core. `emissions[frame][label]` contains a
 * probability or logit-like non-negative score; the model adapter is kept
 * outside this module and is therefore optional.
 */
export function alignCtcEmissions(emissions, tokens, options = {}) {
  const rows = emissions?.map((row) => Array.from(row || [], Number));
  const labels = Array.from(tokens || [], Number);
  const blank = Number.isInteger(options.blankIndex) ? options.blankIndex : 0;
  if (!rows.length || !labels.length) throw new Error("CTC alignment requires emissions and at least one token.");
  if (rows.some((row) => !row.length || row.some((value) => !Number.isFinite(value))))
    throw new Error("CTC emissions must be finite numeric rows.");
  if (rows.length < labels.length) throw new Error("CTC emissions need at least one frame per token.");
  const extended = labels.flatMap((token) => [blank, token]);
  extended.push(blank);
  const frameCount = rows.length;
  const stateCount = extended.length;
  const score = Array.from({ length: frameCount }, () => Array(stateCount).fill(-Infinity));
  const back = Array.from({ length: frameCount }, () => Array(stateCount).fill(-1));
  score[0][0] = logProbability(rows[0][blank]);
  score[0][1] = logProbability(rows[0][labels[0]]);
  for (let frame = 1; frame < frameCount; frame++) {
    for (let state = 0; state < stateCount; state++) {
      const candidates = [{ state, score: score[frame - 1][state] }];
      if (state > 0) candidates.push({ state: state - 1, score: score[frame - 1][state - 1] });
      if (state > 1 && extended[state] !== blank && extended[state] !== extended[state - 2]) {
        candidates.push({ state: state - 2, score: score[frame - 1][state - 2] });
      }
      const best = candidates.reduce((left, right) => (right.score > left.score ? right : left));
      score[frame][state] = best.score + logProbability(rows[frame][extended[state]]);
      back[frame][state] = best.state;
    }
  }
  const finalState =
    score[frameCount - 1][stateCount - 1] >= score[frameCount - 1][stateCount - 2] ? stateCount - 1 : stateCount - 2;
  if (!Number.isFinite(score[frameCount - 1][finalState])) throw new Error("CTC trellis has no valid path.");
  const states = Array(frameCount);
  states[frameCount - 1] = finalState;
  for (let frame = frameCount - 1; frame > 0; frame--) states[frame - 1] = back[frame][states[frame]];
  const spans = labels.map((token, index) => {
    const state = index * 2 + 1;
    const frames = states.map((value, frame) => (value === state ? frame : -1)).filter((frame) => frame >= 0);
    return { token, startFrame: frames[0] ?? null, endFrame: frames.at(-1) ?? null };
  });
  return { tokens: labels, spans, score: score[frameCount - 1][finalState], frameCount, method: "ctc_viterbi" };
}

function logProbability(value) {
  return Math.log(Math.max(Number.isFinite(value) ? value : 0, 1e-12));
}
