# v1 — ReplayGain

## Status
🟡 Important
Status: ✅ Done (v1.0)

## Problem
Different YouTube songs have wildly different volumes. One song is deafening, another is whisper-quiet.

## Solution
Compute or fetch loudness normalization data and apply gain in the audio pipeline.

## Tasks
- [x] Fetch `loudness` or `replaygain` from SDK if available
- [x] Fallback: analyze first 30s of audio with Web Audio API `AnalyserNode`
- [x] Store computed gain in `song.replaygain`
- [x] Apply gain in `SamplingMaster` or `BackgroundAudio`
- [ ] User-adjustable master volume slider

## Depends On
- `continuous-audio.md` (v1)

## Implementation Notes

Implemented in `bemuse/src/sdk/replaygain.ts`:
- `TARGET_LUFS = -14` constant.
- `computeGainFromBuffer(buffer, sampleSeconds = 30)` — RMS approximation over the first 30s (fast, non-K-weighted). Returns linear gain multiplier.
- `gainFromLoudness(songLufs, targetLufs)` — converts an explicit loudness value (e.g. from YouTube metadata) to linear gain.
- `analyzeReplayGain(audioContext, url)` — async: fetches the URL, decodes via `audioContext.decodeAudioData`, calls `computeGainFromBuffer`. Throws on fetch/decode failure so callers can handle gracefully.
- `formatReplayGainTag(gain)` — formats as `+X.Y dB` / `-X.Y dB`.

Applied in `sdk-game-launcher.ts`: after creating the `GainNode` chain, `analyzeReplayGain` is called non-blocking (`.then/.catch`). Game starts at unity gain (`gainNode.gain.value = 1.0`); the gain is updated in-place once analysis completes. On error, a warning is logged and unity gain is kept — no crash, no restart.

The proxy URL is fetched twice (once for the `<audio>` element, once for `decodeAudioData`). Browser HTTP cache deduplicates this in practice; a proper fix is deferred to v2.

User-adjustable volume slider is deferred to v2.
