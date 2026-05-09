# v0 — Foundation / Proof of Life

> **Goal:** Prove the core integration works end-to-end. A developer can click a button and play one song.

## Exit Criteria
- [ ] Build succeeds with zero errors
- [ ] SDK server proxies audio and lyrics correctly
- [ ] Bemuse loads a bmson generated from SDK lyrics
- [ ] Audio plays in sync with falling notes
- [ ] A non-technical user can follow README to run it

## Files

| File | Topic |
|------|-------|
| [build-system.md](./build-system.md) | Rush, Node 16, pnpm setup |
| [sdk-proxy.md](./sdk-proxy.md) | `/api` webpack proxy to SDK server |
| [bmson-generation.md](./bmson-generation.md) | Convert `LyricLine[]` → bmson JSON |
| [resources-adapter.md](./resources-adapter.md) | `IResources` adapter for SDK endpoints |
| [audio-context-fix.md](./audio-context-fix.md) | Chrome autoplay policy workaround |
| [title-screen.md](./title-screen.md) | "MusicStream" button on title |
| [key-hints.md](./key-hints.md) | Keyboard lane labels during gameplay |
| [hardcoded-song.md](./hardcoded-song.md) | Single demo song (Queen) |
| [known-hacks.md](./known-hacks.md) | Document all temporary workarounds |
