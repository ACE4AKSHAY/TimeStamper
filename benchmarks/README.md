# Benchmark dataset

The checked-in `example.synthetic.json` is only a deterministic smoke fixture; it contains no copyrighted audio. A research dataset is needed to answer whether the algorithm works. It should be kept outside Git unless every audio/lyric item is licensed for redistribution.

Each real case should have:

```text
case-id/
  audio.mp3              # rights-cleared or locally referenced, not committed
  lyrics.txt              # UTF-8, supplied lyrics
  reference.json          # manually verified line start times
  metadata.json           # language, genre, duration, recording type, difficulty
```

`reference.json` should contain `startTime` values in seconds and a note about who/when verified them. Do not use an automatically generated LRC as ground truth. Begin with a small, balanced set (for example 20–30 tracks across languages and recording conditions), then grow it after the measurement process is stable. The application itself does not need a dataset for manual editing or normal offline use; the dataset is needed for scientific evaluation and regression testing.

Run the synthetic smoke benchmark with:

```powershell
$env:Path = 'C:\Users\aksha\AppData\Local\nvm\v22.23.2;' + $env:Path
& 'C:\Users\aksha\AppData\Local\nvm\v22.23.2\node.exe' scripts/run-benchmark.mjs benchmarks/example.synthetic.json
```
