# v2 — Song Search

## Status
🟡 Important

## Problem
Users must paste a YouTube URL. No discovery.

## Solution
Search interface powered by SDK's `search()` function.

## Tasks
- [ ] Search bar with debounced input
- [ ] Search by title, artist, or lyrics snippet
- [ ] Results list with thumbnail, title, artist, duration
- [ ] Filter by genre, year, language
- [ ] Autocomplete suggestions
- [ ] "Feeling Lucky" random song button
- [ ] Search history

## UI Mock
```
┌─────────────────────────────────────────┐
│  🔍 Search songs...                     │
├─────────────────────────────────────────┤
│  [thumb] Queen — We Will Rock You  2:02 │
│  [thumb] AC/DC — Back in Black     4:14 │
│  [thumb] Nirvana — Smells Like...  5:01 │
└─────────────────────────────────────────┘
```

## Depends On
- `sdk-proxy.md` (v0)
