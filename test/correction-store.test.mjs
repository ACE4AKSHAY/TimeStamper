import test from "node:test";
import assert from "node:assert/strict";
import {
  createCorrectionJournal,
  createCorrectionRecord,
  deriveLearningHints,
  deserializeCorrections,
  serializeCorrections,
  summarizeCorrections,
} from "../src/learning/correction-store.js";

test("correction records retain only bounded numeric calibration data", () => {
  const record = createCorrectionRecord({
    caseId: "song-1",
    lineId: "line-1",
    engine: "retime-lrc",
    predictedTime: 4,
    correctedTime: 4.2,
    form: "timed",
  });
  assert.equal(record.errorSeconds, 0.2);
  const roundTrip = deserializeCorrections(serializeCorrections([record]));
  assert.deepEqual(roundTrip[0], record);
});

test("summaries and hints require a minimum verified sample count", () => {
  const records = [1, 2, 3].map((value) =>
    createCorrectionRecord({ engine: "retime-lrc", predictedTime: value, correctedTime: value + 0.2 }),
  );
  assert.deepEqual(summarizeCorrections(records), [
    {
      engine: "retime-lrc",
      count: 3,
      meanSignedErrorSeconds: 0.2,
      meanAbsoluteErrorSeconds: 0.2,
    },
  ]);
  assert.equal(deriveLearningHints(records).enabled, false);
  const hints = deriveLearningHints(records, { minimumSamples: 3, maxOffsetSeconds: 0.1 });
  assert.deepEqual(hints.engineOffsets, { "retime-lrc": 0.1 });
  assert.equal(hints.enabled, true);
});

test("journal persists bounded records through an injected local storage", () => {
  const data = new Map();
  const storage = {
    getItem(key) {
      return data.get(key) || null;
    },
    setItem(key, value) {
      data.set(key, value);
    },
  };
  const journal = createCorrectionJournal({ storage, limit: 2 });
  journal.append({ engine: "a", predictedTime: 1, correctedTime: 1.1 });
  journal.append({ engine: "a", predictedTime: 2, correctedTime: 2.1 });
  journal.append({ engine: "a", predictedTime: 3, correctedTime: 3.1 });
  assert.equal(journal.records().length, 2);
  const reopened = createCorrectionJournal({ storage, limit: 2 });
  assert.equal(reopened.records().length, 2);
  reopened.clear();
  assert.equal(reopened.records().length, 0);
});
