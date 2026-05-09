# v1 — Settings Persistence

## Status
🟢 Nice to have
Status: ✅ Done (v1.0)

## Problem
MusicStream-specific settings (difficulty, recent songs) are lost on refresh.

## Solution
Store in localStorage under `musicstream.*` keys.

## Tasks
- [x] Save last selected difficulty
- [x] Save recent songs list (max 20)
- [x] Save favorite songs list
- [x] Save MusicStream mode preferences (separate from Bemuse options)
- [x] Export/import settings as JSON
- [ ] Sync settings across devices (optional, v3+)

## Storage Schema
```typescript
interface MusicStreamSettings {
  version: 1
  recentSongs: RecentSong[]   // max 20, newest first
  favoriteSongs: string[]      // videoIds
  defaultDifficulty: 'easy' | 'normal' | 'hard' | 'expert'
  defaultSpeed: number         // 0.5–2.0, default 1.0
}
```

## Depends On
- `song-input.md` (v1)

## Implementation Notes

Implemented in `bemuse/src/sdk/settings.ts`. Storage key: `musicstream.settings`. Schema version field (`version: 1`) enables future migrations; `isValidSettings()` rejects malformed or stale data and falls back to `DEFAULT_SETTINGS`.

Exported API:
- `loadSettings() / saveSettings(partial)` — full read/merge-write.
- `addRecentSong(song)` — deduplicates by `videoId`, prepends, trims to `MAX_RECENT = 20`.
- `clearRecentSongs()`, `getRecentSongs()`, `getFavoriteSongs()`, `isFavorite(videoId)`, `toggleFavorite(videoId)`.
- `getDefaultDifficulty() / setDefaultDifficulty(d)`.
- `getDefaultSpeed() / setDefaultSpeed(speed)` — clamps to `[0.5, 2.0]`.
- `exportSettings()` — returns JSON string.
- `importSettings(json)` — validates before persisting; returns `false` on bad input.

All `localStorage` calls are wrapped in try/catch; quota-exceeded or unavailable storage fails silently. `RecentSong` records include `videoId`, `title`, `artist`, optional `thumbnail`, and `playedAt` timestamp.

Cross-device sync is deferred to v3.
