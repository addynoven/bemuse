# v0 — Resources Adapter

## Status
✅ Done

## Tasks
- [x] Implement `ICustomSongResources` interface
- [x] `file('musicstream.bmson')` returns inline JSON resource
- [x] `file('audio.mp3')` / `file('audio.ogg')` proxies to SDK
- [x] `resolveUrl()` returns correct SDK endpoint
- [x] `read()` fetches via `fetch()` and returns `ArrayBuffer`
- [x] Fix `file()` to return `Promise<IResource>` not raw object

## Blockers
None

## Known Issues
- All keysound file requests resolve to same proxy URL (browser caches)
- WebM container returned with wrong `Content-Type: audio/ogg`
