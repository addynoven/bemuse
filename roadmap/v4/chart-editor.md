# v4 — Chart Editor

## Status
🟢 Nice to have

## Problem
Auto-generated charts are imperfect. Humans can do better.

## Solution
In-browser editor for placing, moving, and deleting notes.

## Tasks
- [ ] Timeline view with audio waveform
- [ ] Click to place notes, drag to move
- [ ] Playtest mode (instant preview)
- [ ] Undo/redo
- [ ] Export as bmson JSON
- [ ] Submit to community charts (v3)

## UI Mock
```
┌────────────────────────────────────┐
│ Waveform ▓▓▓▓░░▓▓▓▓▓░░░▓▓▓▓▓▓░░ │
│ Lane 1  ·  ·  ·  ▓  ·  ·  ·  ·  │
│ Lane 2  ·  ·  ▓  ·  ·  ·  ▓  ·  │
│ ...                                │
│ [Play] [Undo] [Save] [Export]      │
└────────────────────────────────────┘
```

## Depends On
- `continuous-audio.md` (v1)
