# v0 — SDK Proxy

## Status
✅ Done

## Tasks
- [x] SDK server runs on port 3000
- [x] Webpack dev server proxies `/api` → `localhost:3000`
- [x] `/api/music/track/:id` returns track metadata
- [x] `/api/music/lyrics/:id` returns synced lyrics
- [x] `/api/music/proxy/:id` returns audio stream
- [x] CORS headers pass through proxy correctly

## Blockers
None

## Notes
- Proxy config in `bemuse/config/webpack.js`
- SDK server requires Node >=22 (system default works)
- Server binary: `musicstream/server/dist/index.js`
