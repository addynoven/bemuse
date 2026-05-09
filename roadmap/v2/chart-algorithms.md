# v2 — Chart Algorithms

## Status
🟡 Important

## Problem
Only one algorithm (lyric timing). Boring for repeat plays.

## Solution
Multiple chart generators selectable per song.

## Tasks
- [ ] **Lyric Algorithm** (v0) — notes on lyric lines
- [ ] **Rhythm Algorithm** — detect drum beats via audio analysis
- [ ] **Melody Algorithm** — pitch detection maps to lanes
- [ ] **Hybrid Algorithm** — combine lyric + rhythm + melody
- [ ] **Random Algorithm** — procedurally generated, different every time
- [ ] Algorithm picker UI before play
- [ ] Community-submitted algorithms (plugin API, v5)

## Audio Analysis for Rhythm
- Use Web Audio API `AnalyserNode` for FFT
- Detect onset peaks (drum hits)
- Map peaks to lanes based on intensity

## Audio Analysis for Melody
- Use `Meyda` or similar library for pitch detection
- Map MIDI note to lane (low = left, high = right)

## Depends On
- `note-patterns.md` (v1)
