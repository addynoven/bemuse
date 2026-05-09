# v0 — Build System

## Status
✅ Done

## Tasks
- [x] Fork `bemusic/bemuse`
- [x] Install Node 16 via nvm (Rush requirement)
- [x] Run `rush update` successfully
- [x] Run `rush build` successfully (8 packages)
- [x] Configure webpack dev server proxy for `/api`
- [x] Document build steps in README

## Blockers
None

## Notes
- System Node is v24 but Bemuse requires `>=16.12.0 <17.0.0`
- Use `nvm use 16` before all Rush commands
- Build command: `node common/scripts/install-run-rush.js build`
- Dev command: `node common/scripts/install-run-rush.js dev`
