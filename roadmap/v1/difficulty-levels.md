# v1 — Difficulty Levels

## Status
🟡 Important
Status: ✅ Done (v1.0)

## Problem
Current charts have exactly one note per lyric line. No variation.

## Solution
Generate 4 chart densities from the same lyric data.

## Tasks
- [x] **Easy:** One note per lyric line (current behavior)
- [x] **Normal:** One note per lyric line + occasional doubles on emphasized words
- [x] **Hard:** Word-level notes (2-4 notes per lyric line) + streams
- [x] **Expert:** Word-level + jacks + chord splashes + scratch lanes
- [x] BPM-based density scaling (faster songs = more notes)
- [x] Difficulty selector in song input dialog
- [ ] Store high scores per difficulty

## Note Density Targets
| Difficulty | Notes / Minute | Total (3min song) |
|------------|----------------|-------------------|
| Easy       | ~20            | ~60               |
| Normal     | ~40            | ~120              |
| Hard       | ~80            | ~240              |
| Expert     | ~150           | ~450              |

## Depends On
- `bmson-generation.md` (v0)

## Implementation Notes

All four difficulty engines are in `bemuse/src/sdk/chart-generator.ts`:

- `generateEasy`: one note per lyric line, cycling lanes 1–7.
- `generateNormal`: one note per line; adds a chord note on `isEmphasized()` lines (ALL_CAPS or ending with `!`); also adds extra notes for emphasized individual words when `words[]` is available.
- `generateHard`: tokenizes each line to word level via `tokenize()`; consecutive tokens within 0.3s trigger a two-note stream pair.
- `generateExpert`: full pattern engine — chord splash on every 4th phrase start; within-stream detection (0.3s window); staircase runs for fast clusters (0.15s window); jack detection for consecutive identical words.

`generateFallback()` is used when `lines` is empty, distributing notes at the density targets above.

`FALLBACK_NOTES_PER_MIN` constants: `{ easy: 20, normal: 40, hard: 80, expert: 150 }`.

The difficulty selector is rendered in `SDKMusicSelectScene.tsx` and persisted via `setDefaultDifficulty()` / `getDefaultDifficulty()` in `settings.ts`. High-score storage per difficulty is deferred to v2.
