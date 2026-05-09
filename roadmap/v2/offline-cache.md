# v2 — Offline Cache

## Status
🟢 Nice to have

## Problem
No internet = no game.

## Solution
Cache audio + charts in IndexedDB for offline play.

## Tasks
- [ ] Cache bmson charts in IndexedDB
- [ ] Cache audio streams in IndexedDB (or Cache API)
- [ ] Background sync: download favorites when online
- [ ] "Offline Mode" indicator
- [ ] Limit cache size (e.g., 500MB) with LRU eviction

## Depends On
- `settings-persistence.md` (v1)
