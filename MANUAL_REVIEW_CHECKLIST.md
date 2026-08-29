# LyricSync manual review checkpoint

This is the current human-review gate. It is intentionally small: review a few
representative cases carefully rather than trying to inspect every feature at
once.

## 1. Launch with the requested NVM Node

Open PowerShell and run:

```powershell
Set-Location 'C:\Users\aksha\Documents\ChatGPT\TimeStamper'
$env:Path = 'C:\Users\aksha\AppData\Local\nvm\v22.23.2;' + $env:Path
& 'C:\Users\aksha\AppData\Local\nvm\v22.23.2\npm.cmd' run desktop
```

If Electron does not open, use the browser fallback in a second PowerShell:

```powershell
Set-Location 'C:\Users\aksha\Documents\ChatGPT\TimeStamper'
$env:Path = 'C:\Users\aksha\AppData\Local\nvm\v22.23.2;' + $env:Path
& 'C:\Users\aksha\AppData\Local\nvm\v22.23.2\npm.cmd' start
```

Then open `http://localhost:4173`.

## 2. Files to use

Use the separate folder containing your manually reviewed audio/LRC pairs
(the folder ending in `2026-08-29`). Start with two or three cases:

1. one English vocal song;
2. one Telugu, Hindi, or another native-script vocal song;
3. one case with a long intro or an unusual pause, if available.

Keep the original audio and LRC files unchanged. The application edits its
in-memory project; export only to a new review folder if you test exporting.

## 3. Product/UI checks

For each selected case:

1. Import the audio and the matching LRC/TXT file.
2. Confirm the lyric script displays correctly; do not translate or change it.
3. Click the waveform, drag it, and confirm the time display follows in
   `mm:ss.mmm` form.
4. Press Play, then Stop. Confirm Stop preserves the current position.
5. Press Reset and confirm the audio and waveform return to `00:00.000`.
6. Hold Rewind and Fast-forward. Confirm they move continuously rather than
   jumping to one fixed skip point.
7. Click a lyric timestamp and confirm audio, waveform, and scrollbar seek to
   that timestamp.
8. Select a line, press `T`, and confirm it stamps and selects/scrolls to the
   next line. Test enough lines to make the list scroll.
9. Try the row icons: stamp, clear, insert empty line, and duplicate line.
   Hover each icon and confirm its tooltip name is understandable.
10. Enter a timestamp earlier than the preceding line. Confirm a short toast
    appears and the invalid value is not accepted.

## 4. Settings checks

Open Settings and test one change at a time:

- theme;
- waveform colour;
- text size;
- each shortcut, including changing `T` to another key;
- duplicate shortcut rejection;
- Reset defaults, then Save.

Close and reopen Settings to confirm saved values remain. Do not assess final
visual polish yet; function and accessibility are the priority at this gate.

## 5. Algorithm checks

Make a copy of one reviewed LRC before testing automatic timing. In the app:

1. Load the matching audio and lyric text.
2. Clear timestamps only in the in-memory project.
3. Click **Initial timing**.
4. Listen to several generated starts against the vocal entrance. Record
   whether each is early, late, or close; do not treat generated timestamps as
   ground truth.
5. Compare with the manually reviewed LRC in a separate viewer. Do not save
   over the reviewed file.

The current desktop UI exposes the explainable audio-only baseline. The
reference-template MFCC/DTW experiments are CLI research tools and are not yet
the production default.

## 6. What to report back

Report only these items first:

```text
Case/language:
Playback/seek: pass or issue
Stop preserves position: pass or issue
Reset/rewind/fast-forward: pass or issue
T auto-next and scrolling: pass or issue
Timestamp-order toast: pass or issue
Settings shortcuts: pass or issue
Initial timing: early / late / close, with 2–3 example lines
Instrumental or special-version concern: yes / no / unsure
```

Screenshots are useful for visual defects; for timing issues include the song
case name and approximate line number. No network connection is required.

## Do not do yet

- Do not delete, rename, or move the originals.
- Do not upload audio or lyrics to GitHub.
- Do not use generated timestamps as verified references.
- Do not spend time judging export/project-file behavior unless you want to;
  those checks are deliberately deferred.
- Do not compare a lyric file with a different instrumental, piano, karaoke,
  remix, or cover recording and call it an algorithm failure; mark it as a
  special-version concern.
