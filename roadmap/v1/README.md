# v1 — Core Gameplay Polish

> **Goal:** A stranger can play any song from start to finish and enjoy it. The experience feels intentional, not hacked.

## Exit Criteria
- [x] User can input any YouTube URL and play it
- [x] Audio plays continuously (no per-note restarts)
- [x] At least 3 difficulty levels (4 shipped: easy / normal / hard / expert)
- [x] Notes feel musical (not just a dump of lyric timestamps)
- [x] Scoring makes sense for lyric-based gameplay
- [x] "MusicStream Mode" has distinct visual identity (gradient theme + animated grade reveal + per-difficulty/grade colors)

**v1.0 ship-ready** — all exit criteria met. Full `rush build --to bemuse` succeeds.

## Files

| File | Topic | Status |
|------|-------|--------|
| [continuous-audio.md](./continuous-audio.md) | Background track that doesn't restart on every hit | ✅ Done |
| [song-input.md](./song-input.md) | Paste YouTube URL / videoId dialog | ✅ Done |
| [difficulty-levels.md](./difficulty-levels.md) | Easy / Normal / Hard / Expert chart generation | ✅ Done |
| [note-patterns.md](./note-patterns.md) | Jacks, streams, chords, doubles — make charts musical | ✅ Done |
| [scoring-system.md](./scoring-system.md) | Score/combo tuned for lyric charts, not BMS | ✅ Done |
| [visual-identity.md](./visual-identity.md) | MusicStream-branded skin, colors, logo | ✅ Done |
| [replaygain.md](./replaygain.md) | Normalize audio volume across different songs | ✅ Done |
| [error-handling.md](./error-handling.md) | Graceful fallbacks for missing lyrics, failed proxy | ✅ Done |
| [settings-persistence.md](./settings-persistence.md) | Save MusicStream preferences to localStorage | ✅ Done |
