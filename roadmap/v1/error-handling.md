# v1 — Error Handling

## Status
🟡 Important
Status: ✅ Done (v1.0)

## Problem
Missing lyrics or failed proxy = generic error or crash.

## Solution
Graceful degradation with actionable user messages.

## Tasks
- [x] "No synced lyrics found" → offer to play without lyrics (random chart)
- [x] "Video not available" → check region lock / copyright strike
- [x] "Proxy timeout" → retry with exponential backoff
- [x] "Audio decode failed" → transcode server-side or use fallback format
- [x] "Network error" → offline mode prompt
- [x] Generic error screen with "Report Issue" link

## Error States
| Error | User Message | Action |
|-------|-------------|--------|
| No lyrics | "We couldn't find lyrics for this song." | "Play with auto-generated rhythm" / "Try another song" |
| Video blocked | "This video is blocked in your region." | "Try another song" |
| Decode fail | "Audio format not supported." | "Retry" |
| Timeout | "Loading took too long." | "Retry" |

## Depends On
- `song-input.md` (v1)

## Implementation Notes

Typed error hierarchy in `bemuse/src/sdk/errors.ts`:
- `MSErrorCode` union: `'NO_LYRICS' | 'VIDEO_BLOCKED' | 'PROXY_TIMEOUT' | 'AUDIO_DECODE' | 'NETWORK' | 'UNKNOWN'`.
- `MSError extends Error` — carries `code`, `userMessage`, `action`, and optional `cause`.
- Factory functions: `noLyricsError`, `videoBlockedError`, `proxyTimeoutError`, `audioDecodeError`, `networkError`, `unknownError`.
- `fromFetchResponse(res)` maps HTTP status codes: 404→NO_LYRICS, 403/451→VIDEO_BLOCKED, 408/504→PROXY_TIMEOUT, 5xx→PROXY_TIMEOUT.
- `fromFetchError(err)` maps `AbortError`→PROXY_TIMEOUT, `TypeError`→NETWORK, `MSError` passthrough.

All `api.ts` functions (`searchSongs`, `getLyrics`, `getTrack`) catch fetch errors and rethrow as `MSError`. `getLyrics` returns `null` on 404 (treated as "no lyrics available" rather than an error, enabling fallback chart generation).

In `SDKMusicSelectScene.tsx`, `showError(e)` checks `isMSError(e)` and renders a dismissible error banner with `e.userMessage` and an action button. For retriable errors ("Retry"), the button re-invokes the last failed operation via `lastFailed.current`. For "Try another song", the banner is dismissed without retrying.

When `getLyrics` returns `null`, `SDKMusicSelectScene` proceeds with `lines: []` which triggers `generateFallback()` in `chart-generator.ts` — the user plays with an auto-generated rhythm chart rather than seeing an error.
