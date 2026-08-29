import { constrainedDtw } from "./dtw.js";
import { constrainedDtwBanded } from "./dtw-banded.js";

export function alignMfccSequences(audioMfcc, lyricMfcc, options = {}) {
  const audioFrames = audioMfcc?.frames || audioMfcc; const lyricFrames = lyricMfcc?.frames || lyricMfcc;
  const implementation = options.implementation === "banded" ? constrainedDtwBanded : constrainedDtw;
  const result = implementation(audioFrames, lyricFrames, options);
  return { ...result, implementation: options.implementation === "banded" ? "banded" : "full-matrix", audioFrameRate: audioMfcc?.frameRate || null, lyricFrameRate: lyricMfcc?.frameRate || null, method: "mfcc_dtw" };
}
