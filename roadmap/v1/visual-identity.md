# v1 — Visual Identity

## Status
🟢 Nice to have
Status: ✅ Done (v1.0)

## Problem
The game looks exactly like Bemuse. Users can't tell they're in "MusicStream Mode."

## Solution
Custom skin, colors, and branding for MusicStream mode.

## Tasks
- [x] MusicStream entry point on title screen
- [x] Distinct dark gradient theme for SDK scenes
- [x] Animated background pulse on song-select scene
- [x] Per-grade color theming on result overlay (CSS custom properties)
- [x] Grade reveal animation (scale + bounce) and glow pulse ring
- [x] Perfect Lyrics medal entrance + shimmer
- [x] Stat row stagger fade-in
- [x] Pill-shaped buttons + focus glow on inputs
- [x] Favorited cards get accent stripe
- [x] Different color scheme per difficulty/grade
- [ ] Custom note skin inside the game display (deferred to v2 — invasive bemuse change)
- [ ] Lyric text floating above note panel during gameplay (v2)
- [ ] Animated audio-reactive background via FFT (v2)
- [ ] Full-screen song thumbnail backdrop during gameplay (v2)

## Depends On
- `title-screen.md` (v0)

## Implementation Notes

Two SCSS files own the SDK theme:

**`bemuse/src/app/ui/SDKMusicSelectScene.scss`** (~250 lines)
- Root gradient `#0a1428 → #1a0a28` with two radial accent halos.
- `@keyframes msPulse` (8s) breathes the halos at low opacity.
- `.SDKMusicSelectScene__title` uses gradient text (`background-clip: text`) in MusicStream blue→purple.
- Pill-style difficulty selector with active state accent (`box-shadow: inset + outer glow`).
- Cards lift on hover (`translateY(-1px)`) and brighten background.
- Favorited cards get a `--ms-accent` left-edge stripe via `&--favorite::before`.
- All inputs get a `0 0 0 3px rgba(74,158,255,0.25)` focus ring.
- Recent section header has a small accent dot via `::before`.

**`bemuse/src/app/ui/SDKResultOverlay.scss`** (~180 lines)
- Cinematic radial+linear background gradient with grade-tinted halo.
- `@keyframes gradeReveal` — 600ms scale 0 → 1.05 → 1 bounce on the grade letter.
- `@keyframes gradePulse` — 3s glow ring around the letter.
- `@keyframes medalIn` + shimmer pseudo-element on the Perfect Lyrics medal.
- `@keyframes statFadeIn` driven per-row by `--stagger` CSS variable (80ms steps).
- `--ms-grade-color` CSS variable threaded through the inner container — colors the grade letter and difficulty label per result.
- Pill buttons matching the search scene.

Both `.tsx` files use BEM-style class names (`SDKMusicSelectScene__card--favorite`, etc.). All previous behavior is preserved verbatim — only styling moved out of inline `style={{ ... }}` props into SCSS classes. Dynamic data-driven styles (error border on URL input, per-grade colors, stagger delay) stay inline as CSS custom properties.

Full webpack build (`rush build --to bemuse`) succeeds in ~26s with these changes; typecheck is clean.
