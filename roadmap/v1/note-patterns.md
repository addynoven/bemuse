# v1 — Note Patterns

## Status
🟡 Important
Status: ✅ Done (v1.0)

## Problem
Notes are placed linearly: lane 1, lane 2, lane 3... cycling. Boring and not musical.

## Solution
Apply rhythm-game patterns based on lyric stress, syllable count, and musical phrasing.

## Tasks
- [x] **Jack patterns:** Repeated same lane for repeated syllables ("rock you, rock you")
- [x] **Streams:** Evenly spaced notes across lanes for fast lyrical passages
- [x] **Chords:** Two simultaneous notes on emphasized beats or chorus entries
- [x] **Staircases:** Ascending/descending lane runs for melodic rises/falls
- [ ] **Trills:** Rapid lane alternation for vibrato or drum rolls
- [ ] **Scratch integration:** BM mode uses scratch lane on phrase boundaries
- [x] Avoid impossible patterns (e.g., 1/16th notes at 200 BPM on 7 keys)

## Depends On
- `difficulty-levels.md` (v1)

## Implementation Notes

Implemented in `bemuse/src/sdk/chart-generator.ts`. All helpers are pure functions that return `RawNote[]`:

- `makeJack(lane, count, baseTimeSec, gapSec)` — repeated same-lane notes spaced by `gapSec`.
- `makeStream(lanes, baseTimeSec, gapSec)` — notes on each lane at evenly spaced offsets.
- `makeChord(lanes, timeSec)` — all provided lanes at the same pulse.
- `makeStaircase(startLane, endLane, baseTimeSec, gapSec)` — ascending or descending run.

`dedupeByLane()` enforces a minimum gap of `MIN_NOTE_GAP_MS = 50ms` between notes on the same lane, preventing physically impossible patterns.

`isEmphasized(text)` drives chord/double placement: returns true for ALL_CAPS text or text ending with `!`.

`tokenize(line)` uses `line.words[]` for precise word timing when available; otherwise distributes words across an estimated 1-second window after the line start time.

Trills and scratch integration are deferred to v2 (`word-level-notes.md`).
