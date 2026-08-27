# Manual review guide (required before real benchmarks)

You told me that none of the songs and lyrics have been manually checked yet. That is completely fine for development, but we must not use them as scientific ground truth until a person verifies them. The audit and review queue only organize the work; they do not decide whether a pair is correct.

## Generate a private review queue

```powershell
$env:Path = 'C:\Users\aksha\AppData\Local\nvm\v22.23.2;' + $env:Path
& 'C:\Users\aksha\AppData\Local\nvm\v22.23.2\node.exe' scripts/create-review-queue.mjs
```

The output is `benchmarks/private/review-queue.json`, which is ignored by Git. It contains up to 20 exact filename candidates that are not flagged as likely instrumental. You can generate a different size by adding a third argument, such as `10`.

## What you need to check manually

For each queued item, open the audio and lyric file in LyricSync and complete these checks:

| Check | What to do | Accepted value |
| --- | --- | --- |
| Audio matches lyrics | Listen to the recording and compare the words/lines. Reject covers, alternate edits, unrelated songs, and wrong language versions. | `true` or `false` |
| Vocal recording | Confirm that the recording contains the sung vocal. Reject piano, instrumental, BGM, karaoke and ringtone versions. | `true` or `false` |
| Timestamp verification | Listen line by line. Confirm or correct every start time; downloaded LRC timestamps are only suggestions. | `true` or `false` |
| Corrections | Count how many timestamps you changed. | Non-negative integer |
| Notes | Record uncertainty, ad-libs, overlapping singers, long intro/outro, noise, or other failure details. | Short text |

Only items with all three Boolean checks set to `true` should become benchmark ground truth. Items with `false`, unknown, mismatched lyrics, or instrumental audio should remain excluded but can still be useful for failure analysis later.

## What you do not need to review yet

You do not need to check every file. Start with 5–10 clear vocal songs across different languages or recording conditions. The app can still be used normally without any dataset review; this manual process is only for measuring algorithm accuracy.

Do not upload or commit your audio, lyrics, private manifest, or review queue. The review queue is a local preparation tool, not a public dataset.
