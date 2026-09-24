# Automatic deterministic engine routing

## Purpose

The project now exposes an `automatic` engine route for unattended experiments
and future desktop integration. It does not learn from data and does not
recognize language. It inspects which explainable profiles are available:

1. sufficient voicedness plus energy → adaptive vocal-gated Boundary-DP;
2. energy plus spectral flux → combined profile;
3. energy only → adaptive Boundary-DP fallback.

Every selected engine remains separately callable and the result records the
route, reason, and voicedness summary. No existing engine was removed or
silently changed.

The desktop **Automatic timing** action currently receives the local RMS energy
profile and therefore uses the transparent energy fallback. Additional profile
extractors can be connected later without changing the route contract.

## Run

```powershell
$env:Path = 'C:\Users\aksha\AppData\Local\nvm\v22.23.2;' + $env:Path
npm test
npm run experiment-full-engine
```

The 60-case automated comparison is synthetic and contains no copyrighted
audio. Its ranking is a development signal, not evidence of real-song
accuracy; independently verified recordings remain necessary for that claim.

The latest run completed all 60 cases and 313 line starts without failures.
The synthetic ranking was vocal-gated Boundary-DP (0.745 s MAE), combined
profile (0.792 s), adaptive vocal (0.800 s), then energy baseline (0.839 s).
These numbers select no production default until real recordings are evaluated.
