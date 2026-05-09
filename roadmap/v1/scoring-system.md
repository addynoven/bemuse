# v1 — Scoring System

## Status
🟡 Important
Status: ✅ Done (v1.0)

## Problem
Bemuse's scoring assumes dense BMS charts (hundreds of notes). Our lyric charts have ~60 notes. A single miss tanks the score unfairly.

## Solution
Recalibrate scoring, combo, and accuracy for sparse lyric-based charts.

## Tasks
- [x] Adjust judgment windows for slower, more deliberate charts
- [x] Implement "lyric accuracy" — bonus for hitting notes exactly on lyric timing
- [x] Longer combo multipliers (fewer notes = each one matters more)
- [x] Grade thresholds recalibrated (S 95% / A 85% / B 75% / C 60% / D <60%)
- [ ] Show lyric text as floating text on hit (visual feedback)
- [x] "Perfect Lyrics" medal: 100% of notes hit with timing < 0.05s
- [x] Wire real `PlayerStats` from bemuse's game engine into the result overlay

## Depends On
- `difficulty-levels.md` (v1)

## Implementation Notes

The grade helper is in `bemuse/src/sdk/scoring.ts`:
- `calculateMusicStreamGrade(stats: NoteStats): MSScoreResult` — pure function, no bemuse imports.
- Score formula: `baseAccuracy * 90 + lyricAccuracy * 5 + comboBonusRatio * 5` (clamped 0–100).
- `MS_JUDGMENT_WINDOWS_MS`: `{ perfect: 50, great: 90, good: 140, bad: 200 }` — wider than bemuse defaults.
- `perfectLyricsMedal` is true when every note is hit and `lyricAccuracy === 1`.

`SDKResultOverlay.tsx` renders grade (large colored letter), score %, lyric accuracy %, max combo, miss count, and the "Perfect Lyrics" medal badge. Grade colors: S=gold, A=blue, B=green, C=orange, D=red.

**Stats wiring:** `bemuse/src/app/game-launcher.tsx` accepts an `onResult?: (stats: PlayerStats) => void` callback in `LaunchOptions`. When the game finishes (`state.finished === true`), it fires `onResult` with the raw bemuse `PlayerStats`. SDK launcher sets `skipResultScene: true` to suppress bemuse's built-in result and provides `onResult` to capture stats. `mapPlayerStatsToNoteStats()` in `sdk-game-launcher.ts` maps:
- `totalNotes` ← `stats.totalNotes`
- `combo` / `maxCombo` ← `stats.combo` / `stats.maxCombo`
- `misses` ← `stats.counts[MISSED]` (MISSED = -1)
- `perfects` ← `stats.counts[1]` (Judgment.Meticulous, ~20ms window)
- `hits` ← `stats.numJudgments - misses`

If the user quits mid-song (`state.finished === false`), `onResult` is not called and the overlay falls back to a zero-hit `NoteStats` initialized with `chart.noteCount` as the total.

Floating lyric-text feedback on hit is deferred to v1.1/v2.
