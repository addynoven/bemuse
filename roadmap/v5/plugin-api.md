# v5 — Plugin API

## Status
🟢 Nice to have

## Problem
Only built-in chart algorithms exist.

## Solution
JavaScript API for third-party chart generators.

## Tasks
- [ ] `registerAlgorithm(name, generatorFn)`
- [ ] Generator receives: audio buffer, lyrics, BPM, difficulty
- [ ] Generator returns: bmson-compatible JSON
- [ ] Plugin sandbox (iframe or VM)
- [ ] Plugin marketplace
- [ ] Rating and review system for plugins

## Example Plugin
```javascript
export default {
  name: 'My Algorithm',
  version: '1.0.0',
  generate({ lyrics, bpm, difficulty }) {
    // return bmson JSON
  }
}
```

## Depends On
- `chart-algorithms.md` (v2)
