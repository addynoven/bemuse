# v2 — Trending Charts

## Status
🟢 Nice to have

## Problem
Users don't know what to play.

## Solution
Curated lists of popular songs with pre-generated charts.

## Tasks
- [ ] "Trending Now" — most played this week
- [ ] "New Arrivals" — recently added to platform
- [ ] "Classics" — timeless songs with great charts
- [ ] "Community Picks" — highest rated by players
- [ ] Genre categories (Rock, Pop, Hip-Hop, Electronic)
- [ ] Weekly rotating featured song
- [ ] Pre-generate and cache charts server-side for popular songs

## Technical Notes
- Need backend table: `play_counts`, `ratings`
- Cache generated bmson in Redis/SQLite for 7 days

## Depends On
- `song-search.md` (v2)
