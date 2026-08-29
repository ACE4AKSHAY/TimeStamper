# Experiment 25 — Unicode text-unit duration prior

## Question

Does counting Unicode grapheme clusters provide a more stable language-neutral
lyric-length prior than counting code points, especially for scripts that use
combining marks such as Hindi and Telugu?

## Algorithm

The existing text-weighted Boundary-DP engine remains unchanged by default and
continues to use code points. Passing `textUnit: "grapheme"` counts user-visible
Unicode clusters through `Intl.Segmenter` (with a code-point fallback on older
runtimes). No language is identified, translated, or modelled. This is a
duration prior only; it does not recognize sung words.

## Files

| File | Role |
| --- | --- |
| `src/text-weighted-aligner.js` | Exposes `countTextUnits` and the optional `textUnit` setting. |
| `scripts/run-text-unit-experiment.mjs` | Compares codepoint and grapheme variants on the same fixture. |
| `test/lrc.test.mjs` | Verifies native-script grapheme behavior and selectable alignment. |

## Reproduce

```powershell
$env:Path = 'C:\Users\aksha\AppData\Local\nvm\v22.23.2;' + $env:Path
npm run experiment-text-unit
```

The result is written to ignored `benchmarks/results/text-unit-study.json`.
Real-song references are still required before selecting a default.

## Current fixture result

On the checked-in six-line synthetic fixture, codepoint weighting measured
0.317 seconds MAE versus 0.450 seconds for grapheme weighting. This is not a
general language conclusion—the fixture is too small—but it is evidence to keep
the grapheme path selectable rather than silently promoting it.
