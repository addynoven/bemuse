# v0 — Bmson Generation

## Status
✅ Done (basic)

## Tasks
- [x] Fetch synced lyrics from SDK
- [x] Map `LyricLine.time` to bmson `Note.y` (pulse position)
- [x] Calculate `keysoundStart` accumulation via `c: true`
- [x] Add dummy note at time 0 for correct accumulation
- [x] Generate single sound channel named `audio.mp3`
- [ ] Handle songs with no synced lyrics (fallback)
- [ ] Handle songs with duplicate lyric times

## Blockers
None

## Hacks Documented
- BPM hardcoded to 60 for simple time calculations
- `y = Math.floor(time * 240)` assumes 240 PPQN
- Dummy note at x=0 (auto-keysound) starts audio at t=0

## Future (v1)
- Multiple difficulty levels
- Variable BPM from audio analysis
- Word-level granularity (more notes per lyric line)
