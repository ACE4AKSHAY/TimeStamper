import { constrainedDtw } from "./dtw.js";

export function alignMfccSequences(audioMfcc, lyricMfcc, options = {}) {
  const audioFrames = audioMfcc?.frames || audioMfcc; const lyricFrames = lyricMfcc?.frames || lyricMfcc;
  const result = constrainedDtw(audioFrames, lyricFrames, options);
  return { ...result, audioFrameRate: audioMfcc?.frameRate || null, lyricFrameRate: lyricMfcc?.frameRate || null, method: "mfcc_dtw" };
}
