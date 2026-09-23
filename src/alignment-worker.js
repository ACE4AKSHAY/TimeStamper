import { synchronize } from "./engine.js";

const jobs = new Map();

if (typeof self !== "undefined") {
  self.onmessage = (event) => {
    const message = event.data || {};
    if (message.type === "cancel") {
      jobs.get(message.requestId)?.abort();
      return;
    }
    if (message.type !== "align-reference") return;
    const requestId = message.requestId;
    const controller = new AbortController();
    jobs.set(requestId, controller);
    try { runReferenceAlignment(requestId, message.payload, controller); } finally { jobs.delete(requestId); }
  };
}

function runReferenceAlignment(requestId, payload, controller) {
  try {
    const parameters = payload.parameters || {};
    const result = synchronize({
      lyrics: payload.lyrics,
      duration: payload.duration,
      engine: "reference-template-mfcc-dtw",
      parameters: {
        ...parameters,
        referenceSamples: new Float32Array(payload.referenceSamples),
        targetSamples: new Float32Array(payload.targetSamples),
        referenceSampleRate: payload.referenceSampleRate,
        targetSampleRate: payload.targetSampleRate,
        referenceStarts: payload.referenceStarts,
        referenceDuration: payload.referenceDuration,
        targetDuration: payload.duration,
        signal: controller.signal,
        onProgress: (progress) => self.postMessage({ type: "progress", requestId, progress }),
      },
    });
    self.postMessage({ type: "complete", requestId, result });
  } catch (error) {
    self.postMessage({ type: "error", requestId, error: { name: error?.name || "Error", message: error?.message || String(error) } });
  }
}
