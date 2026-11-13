/**
 * Small, DOM-free helpers used by the browser and desktop frontends.
 * Keeping these decisions outside app.js makes the UI easier to port to a
 * future mobile client without importing browser globals.
 */

export const TIMELINE_FILTERS = Object.freeze({
  all: "all",
  review: "review",
  missing: "missing",
});

export function filterTimelineLines(lines, filter = TIMELINE_FILTERS.all) {
  const source = Array.isArray(lines) ? lines : [];
  if (filter === TIMELINE_FILTERS.review) return source.filter((line) => line?.reviewRequired === true);
  if (filter === TIMELINE_FILTERS.missing) return source.filter((line) => !Number.isFinite(line?.startTime));
  return source;
}

export function formatConfidence(confidence) {
  if (!Number.isFinite(confidence)) return "—";
  return `${Math.round(Math.max(0, Math.min(1, confidence)) * 100)}%`;
}

export function summarizeAlignmentResult(result) {
  if (!result) {
    return {
      status: "idle",
      engine: "Not run",
      reviewed: 0,
      total: 0,
      message: "Automatic timing has not run. Manual edits remain local and reversible.",
      reasons: [],
    };
  }
  const lines = Array.isArray(result.lines) ? result.lines : [];
  const reviewed = lines.filter((line) => line?.reviewRequired === true).length;
  const form = result.diagnostics?.form;
  const plan = result.diagnostics?.plan;
  const reasons = [...(plan?.reasons || form?.reasons || [])].filter(Boolean);
  const refused = result.diagnostics?.refused === true || plan?.refused === true;
  const engine = result.engine || "unknown";
  const status = refused ? "refused" : reviewed ? "review" : "ready";
  const message = refused
    ? `${engine} declined automatic timing. Keep the lines and review them manually.`
    : `${engine} produced ${lines.length} line(s); ${reviewed} need review.`;
  return { status, engine, reviewed, total: lines.length, message, reasons };
}

function clone(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

/**
 * Bounded, serializable undo/redo history. A commit stores the state after a
 * user-visible edit; the current state is passed to undo/redo so no UI state
 * or browser object is ever persisted in the history.
 */
export function createHistory(initialState, options = {}) {
  const limit = Number.isInteger(options.limit) ? Math.max(2, options.limit) : 50;
  const past = [clone(initialState)];
  const future = [];
  return {
    commit(state) {
      const next = clone(state);
      if (JSON.stringify(next) === JSON.stringify(past[past.length - 1])) return false;
      past.push(next);
      while (past.length > limit) past.shift();
      future.length = 0;
      return true;
    },
    undo(currentState) {
      if (past.length < 2) return null;
      future.unshift(clone(currentState));
      past.pop();
      return clone(past[past.length - 1]);
    },
    redo(currentState) {
      if (!future.length) return null;
      past.push(clone(currentState));
      const next = future.shift();
      while (past.length > limit) past.shift();
      return clone(next);
    },
    canUndo() {
      return past.length > 1;
    },
    canRedo() {
      return future.length > 0;
    },
    size() {
      return past.length;
    },
  };
}
