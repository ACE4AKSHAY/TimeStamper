# MFCC template boundary refinement

## Purpose

The main template aligner chooses a monotonic segmentation with constrained
DTW. This isolated refinement pass examines each boundary between neighbouring
lyric templates and tests a small radius of frame shifts. A shift is retained
only when the combined DTW cost of both adjacent lines decreases.

The default radius is zero, so existing runs and the desktop workflow are
unchanged. Set `templateBoundaryRadius` to a small value such as `1` or `2` to
run the experiment. The result records each boundary's original/refined frame,
cost improvement, and whether it changed.

This is not a guarantee of better timing: a local acoustic minimum can move a
boundary away from the true sung onset. Compare it against independently
verified target recordings before enabling it as a production default.
