# v1 — Song Input

## Status
🟡 Important
Status: ✅ Done (v1.0)

## Problem
Only one hardcoded song exists. Users can't play anything else.

## Solution
Modal dialog where users paste a YouTube URL or videoId.

## Tasks
- [x] Parse YouTube URLs (`youtube.com/watch?v=`, `youtu.be/`, `youtube.com/shorts/`)
- [x] Validate videoId format (11 chars, base64-like)
- [x] Pre-flight check: fetch track metadata to confirm song exists
- [x] Show loading spinner while fetching lyrics
- [x] Error state: "No synced lyrics found for this song"
- [x] Error state: "This video is not available"
- [x] Recent history (last 10 songs) in localStorage
- [x] "Play Again" button on result screen

## Depends On
- `sdk-proxy.md` (v0)
- `error-handling.md` (v1)

## Implementation Notes

URL parsing is handled by `bemuse/src/sdk/youtube-url.ts`. It covers `youtube.com/watch?v=`, `youtu.be/`, `youtube.com/shorts/`, `youtube.com/embed/`, `m.youtube.com`, and `music.youtube.com`. Protocol-less inputs (`youtu.be/abc`) are auto-prefixed. Bare 11-char video IDs are accepted directly. `t=` timestamps and `list=` playlist params are parsed but not used for gameplay.

The full song-select UI is in `bemuse/src/app/ui/SDKMusicSelectScene.tsx`:
- URL paste input + Play button at the top; Enter key triggers play.
- Debounced search field (400ms) calls `searchSongs()` from `api.ts`.
- Recent songs list (last 10) loaded from `settings.ts` on mount; updated after each play via `addRecentSong()`.
- Favorites toggle (heart button) per song card; state persisted via `toggleFavorite()`.
- Difficulty selector (Easy / Normal / Hard / Expert) above the list; persisted via `setDefaultDifficulty()`.
- Error banner with action button wired to `isMSError()` from `errors.ts`.

`SDKResultOverlay.tsx` shows the grade screen with a "Play Again" button that re-launches the same song via the `onPlayAgain` callback wired in `sdk-game-launcher.ts`.
