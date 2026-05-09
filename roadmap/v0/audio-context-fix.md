# v0 — AudioContext Fix

## Status
✅ Done

## Problem
Chrome's autoplay policy suspends `AudioContext` until a user gesture. Bemuse's `unmuteAudio()` runs before async loading, so by the time audio plays, the gesture is "stale."

## Fix
Resume `defaultAudioContext` immediately inside the button click handler, before any `async` work:

```typescript
if (defaultAudioContext.state === 'suspended') {
  await defaultAudioContext.resume()
}
```

## Tasks
- [x] Import `defaultAudioContext` from `bemuse/audio-context`
- [x] Resume on user gesture in `sdk-game-launcher.ts`
- [x] Verify audio plays after SDK fetch completes

## Blockers
None
