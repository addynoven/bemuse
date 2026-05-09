# v0 — Known Hacks

> Document every workaround so we can remove it later.

## ✅ Audio: Per-Note Seek-and-Play
**File:** `musicstream-loader.ts`, `wave-factory.js`
**Hack:** All notes share one sound channel. Each note plays the full song from `keysoundStart = note_time`.
**Why:** Bemuse expects short keysound samples per note. SDK provides one full audio stream.
**Resolved in:** v1.0 — `BackgroundAudioPlayer` streams the full track continuously; keysound channel uses a 44-byte silent WAV (`musicstream-adapter.ts`); chart-generator emits `c: false` on all notes so bemuse never triggers per-note audio.

## ✅ Bmson: Dummy Auto-Note at t=0
**File:** `musicstream-loader.ts`
**Hack:** Adds invisible note at x=0, time=0 with `c: false` to reset `keysoundStart` accumulation.
**Why:** Without it, first note's `keysoundStart` would be 0 (relative to first lyric at 18s, not absolute time).
**Resolved in:** v1.0 — continuous audio removes need for this; chart-generator no longer inserts a sentinel note.

## ✅ Stats Stub: `zeroStats` in sdk-game-launcher.ts
**File:** `bemuse/src/app/sdk-game-launcher.ts`
**Hack:** Result overlay was passed an all-zero `NoteStats` because `launch()` had no public hook to retrieve stats.
**Resolved in:** v1.0 — `LaunchOptions` gained `onResult?: (stats: PlayerStats) => void` and `skipResultScene?: boolean` (`bemuse/src/app/game-launcher.tsx`). SDK launcher sets both, captures real `PlayerStats` via the callback, maps to `NoteStats` (`mapPlayerStatsToNoteStats`), and renders the result overlay with real values. Bemuse's built-in `ResultScene` is suppressed for SDK mode.

## BPM: Hardcoded to 60 → 120
**File:** `musicstream-loader.ts` (old), `bemuse/src/sdk/chart-generator.ts` (current)
**Hack:** Old loader used `BPM = 60`. Chart-generator now uses `BPM = 120` with `RESOLUTION = 240`. Still hardcoded — no BPM detection from audio or metadata.
**Why:** Simplifies time→pulse mapping. Real BPM would need `y = time * BPM * PPQN / 60`.
**Fix in:** v2 — detect BPM from audio or metadata (see `chart-algorithms.md`)

## Audio Format: WebM Labeled as OGG
**File:** SDK server proxy
**Hack:** Server returns `Content-Type: audio/ogg; codecs=opus` but body is WebM container.
**Why:** yt-dlp returns WebM. Browser `decodeAudioData` handles it anyway.
**Fix in:** v2 — transcode to proper format server-side

## Promise Return: `file()` Was Synchronous
**File:** `musicstream-adapter.ts`
**Hack:** Initially returned `IResource` instead of `Promise<IResource>`.
**Why:** TypeScript didn't complain, runtime worked, but violated interface contract.
**Fix in:** v0 — already fixed

## Resources: Song Object Fake `replaygain` String
**File:** `sdk-game-launcher.ts`
**Hack:** Sets `bemuseSong.replaygain = '-12.2 dB'` as a placeholder.
**Why:** Bemuse expects this field as a string. Real gain is now applied non-blockingly via `analyzeReplayGain` + `GainNode` chain at runtime, so this static field is unused — but bemuse's collection model still requires it to be present.
**Fix in:** v2 — remove the static placeholder once bemuse stops requiring the field for custom songs.

## Duplicate Audio Fetch
**File:** `sdk-game-launcher.ts`
**Hack:** The proxy URL is fetched twice — once by the `<audio>` element for streaming, once by `analyzeReplayGain` for decoding.
**Why:** Two separate APIs (HTMLAudioElement vs AudioContext.decodeAudioData) need the bytes independently. Browser HTTP cache deduplicates in practice.
**Fix in:** v2 — fetch once, share the ArrayBuffer between the audio element (via Blob URL) and the analyzer.
