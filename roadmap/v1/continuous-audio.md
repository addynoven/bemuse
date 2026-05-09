# v1 — Continuous Audio

## Status
🔴 Blocker for v1
Status: ✅ Done (v1.0)

## Problem
Every note hit stops and restarts the audio from a new offset. Jarring, not musical.

## Solution
Play the full song once as a continuous background track. Note hits only trigger visual feedback + scoring, not audio samples.

## Tasks
- [x] Create `BackgroundAudio` class that streams from SDK URL
- [x] Start audio at game start, pause on pause, stop on exit
- [x] Sync game clock to `HTMLAudioElement.currentTime` instead of `AudioContext.currentTime`
- [x] Mute or remove `SamplesLoader` for MusicStream mode
- [x] Remove dummy auto-note at time 0
- [ ] Handle seek/scrub if implementing practice mode

## Technical Notes
- `GameLoader` expects `SamplingMaster` — may need to make audio optional
- `Clock` class uses `audioContext.currentTime` — need audio-aware clock
- Consider `createMediaElementSource()` to pipe audio through Web Audio for effects

## Depends On
- `resources-adapter.md` (v0) — proxy URL must work

## Implementation Notes

Implemented via `BackgroundAudioPlayer` class (`bemuse/src/sdk/audio-player.ts`). The player wraps an `HTMLAudioElement` with `crossOrigin = 'anonymous'`.

In `sdk-game-launcher.ts`, after loading the URL into the player:
1. `createMediaElementSource(audioEl)` pipes the element into the `defaultAudioContext` Web Audio graph.
2. A `GainNode` is inserted between the source and `destination` to allow ReplayGain adjustment without restarting playback.
3. `sdkAudioPlayer.play()` starts continuous playback before `launch()` is called.
4. `sdkAudioPlayer.destroy()` is called in the `finally` block, which pauses the element and clears `src`, stopping audio on game exit.

The keysound channel in the generated bmson uses a 44-byte silent WAV (`MusicStreamResources` in `musicstream-adapter.ts`) and all notes have `c: false`, so bemuse's `SamplingMaster` never triggers per-note audio. The seek/scrub task is deferred to v2 practice mode.
