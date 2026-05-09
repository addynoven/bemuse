# bemuse/src/sdk

SDK module for MusicStream Rhythm. Bridges the MusicStream backend (lyrics, YouTube proxy, search) with bemuse's game engine.

## Overview

This module handles everything between "user pastes a YouTube URL" and "game launches": fetching track metadata and lyrics, generating a playable bmson chart at the chosen difficulty, normalizing audio loudness, persisting user preferences, and providing typed error handling throughout. It has no runtime dependency on bemuse internals — all exports are plain TypeScript.

## Module Map

| File | Purpose |
|------|---------|
| `api.ts` | `searchSongs`, `getLyrics`, `getAnalysis`, `getTrack`, `getProxyUrl` — all HTTP calls to `/api/music/*`; rethrows as `MSError` |
| `chart-generator.ts` | `generateBmsonFromLyrics` — produces bmson JSON at easy / normal / hard / expert density from `LyricLine[]`; optionally accepts `Analysis` for real BPM, beat-grid snapping, and drum-lane onsets |
| `youtube-url.ts` | `parseYouTubeUrl`, `extractVideoId` — full URL parser covering watch/shorts/embed/youtu.be/bare IDs |
| `settings.ts` | localStorage layer — recent songs, favorites, difficulty, speed; `importSettings`/`exportSettings` |
| `errors.ts` | `MSError` class + `MSErrorCode` union + factory functions + `fromFetchResponse`/`fromFetchError` mappers |
| `replaygain.ts` | `analyzeReplayGain` (async, non-blocking) + `computeGainFromBuffer` + `gainFromLoudness`; target −14 LUFS |
| `scoring.ts` | `calculateMusicStreamGrade(stats)` — pure scoring function; grade thresholds recalibrated for sparse lyric charts |
| `audio-player.ts` | `BackgroundAudioPlayer` class + `sdkAudioPlayer` singleton — continuous `HTMLAudioElement` stream |

## Quick Example

```typescript
import { parseYouTubeUrl } from 'bemuse/sdk/youtube-url'
import { getTrack, getLyrics, getAnalysis } from 'bemuse/sdk/api'
import { generateBmsonFromLyrics } from 'bemuse/sdk/chart-generator'
import { getDefaultDifficulty } from 'bemuse/sdk/settings'
import { launchSDKGame } from 'bemuse/app/sdk-game-launcher'

// 1. Parse the URL the user pasted
const parsed = parseYouTubeUrl(input)
if (!parsed) throw new Error('Invalid YouTube URL')

// 2. Fetch track metadata + lyrics + audio analysis in parallel
const [track, lyrics, analysis] = await Promise.all([
  getTrack(parsed.videoId),
  getLyrics(parsed.videoId),     // returns null if no synced lyrics
  getAnalysis(parsed.videoId),   // returns null if analysis unavailable
])

// 3. Generate a playable chart (falls back to auto-rhythm if lyrics === null)
//    When analysis is present, the chart uses the song's real BPM, snaps
//    lyric notes to the beat grid, and injects drum-lane notes from onsets.
const chart = generateBmsonFromLyrics({
  title: track.title,
  artist: track.artist,
  duration: track.duration,
  lines: lyrics?.synced ?? [],
  difficulty: getDefaultDifficulty(),
  analysis,
})

// 4. Hand off to bemuse
await launchSDKGame(sceneManager, track, chart, analysis)
```

## Difficulty Density (3-minute song)

| Difficulty | Notes/min | ~Total notes |
|------------|-----------|-------------|
| easy       | 20        | ~60         |
| normal     | 40        | ~120        |
| hard       | 80        | ~240        |
| expert     | 150       | ~450        |

Density applies to the fallback generator (no lyrics). With lyrics, note count is driven by lyric line and word count.

## Error Code Reference

| Code | User Message | Triggers |
|------|-------------|----------|
| `NO_LYRICS` | "We couldn't find lyrics for this song." | HTTP 404 from lyrics endpoint |
| `VIDEO_BLOCKED` | "This video is blocked in your region." | HTTP 403 or 451 |
| `PROXY_TIMEOUT` | "Loading took too long." | HTTP 408, 504, 5xx; `AbortError` |
| `AUDIO_DECODE` | "Audio format not supported." | `decodeAudioData` failure |
| `NETWORK` | "Network error. Check your connection." | `TypeError` (fetch failed) |
| `UNKNOWN` | "Something went wrong." | Anything else |

All errors are instances of `MSError` and carry a `userMessage` (safe to show the user), an optional `action` label ("Retry" / "Try another song"), and an optional `cause` for logging.
