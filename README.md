# Vrindavan Wedding Invitation

A phone-first, cinematic 3D wedding invitation (Marathi + English). Vite, React 18, TypeScript, React Three Fiber.

**Status: Phase 5 of 10** — Scene 1 (Invocation, the Yamuna at night), Scene 2 (the groom's world: a moonlit kadamba grove, drifting peacock feathers, a flute melody drawn around the figure and his name in gold) and Scene 3 (the bride's world: a lotus pond, drifting petals, a Paithani border unfurling around her, her anklet bells and her name) are built. Scenes 4–9 are still placeholders (Phases 6–8). Phase 2 added the gate, audio, controls, quality detection and the Part A driver.

## Run

```bash
npm install
npm run dev            # http://localhost:5173
npm run dev:host       # also reachable from your phone on the LAN address
npm run typecheck
npm run check          # layout, camera-framing, quality-rule, Invocation and hero-scene guards; needs Node 22.6+, no other setup
```

Developer URL switches:

| URL | Effect |
| --- | --- |
| `?stage=journey` | Skip the gate (and so the sound) and start scrolling through all nine placeholder scenes |
| `?quality=low` | Force a quality tier: `high`, `medium`, `low`, `lite` |
| `?debug` | Show the FPS counter and debug overlay (always on under `npm run dev`) |
| `?groomDebug` | Draw axes and a ground grid in the groom's scene, to check where the figure and grove stand |

## How it fits together

- One master value `t` (0–1) drives everything. Scene `i` owns a slice of `t` (`SCENE_RANGES` in `src/core/layout.ts`) and receives its own local `progress` (0–1).
- The camera follows one Catmull-Rom spline through `CAMERA_WAYPOINTS`; scene `i` covers the segment between waypoint `i` and `i + 1`.
- Only the active scene and the next one are mounted. A scene unmounts as soon as the next is active, so each scene dissolves its own content over the last 14% of its progress (`sceneFade`); only the sky persists.
- Scene progress follows `t` through a store subscription (`startSceneProgressSync` in `src/core/sceneProgress.ts`), not through the Canvas, so HTML overlays and lite mode work without one.
- Part A auto-plays `t` with a GSAP timeline (`src/core/PartADriver.tsx`, about 38 s, linear so each scene keeps its running time); Part B maps scroll to `t`. Skip and menu jumps end Part A by changing `stage`, which kills the timeline.
- Moving the camera on purpose (menu links, Skip) goes through `useAppStore.getState().jumpTo(t)`. In scroll mode the scroll position owns `t`, so writing `t` directly would be undone on the next frame.
- Scenes 2 and 3 are hero scenes: the camera holds its gaze on one figure (`HERO_SPOTS`, `SCENE_GAZE`, `gazeWeight` in `layout.ts`) for most of the scene, instead of the short glance the other scenes get. The figure is drawn `HERO_HEIGHT` (6 m) tall on purpose: the camera flies past at about 3 m/s and may not turn faster than the Part A limit, so it can't be allowed close, and a human-sized figure at that distance would be a speck on a phone.
- The vertical field of view widens on portrait screens (`fovForAspect`), so rooms stay in frame on phones. `npm run check` fails if that regresses.
- The gate (`src/ui/Gate.tsx`) unlocks audio inside the Enter tap. Audio lives in `src/audio/audioManager.ts`: one looping bed, fades, mute, pause when the tab is hidden.
- Quality tier: `src/core/environment.ts` probes WebGL2, detect-gpu, device memory and data saver once at startup; the pure rules are in `src/core/quality.ts`. The Lite button on the gate overrides it.
- All guest-facing copy lives in `src/content/content.ts` and is currently placeholder.

See `CLAUDE.md` for the rules every phase follows.

## Audio

`public/audio/bed.mp3` is a synthesised placeholder drone, and `public/audio/anklet.mp3` a placeholder bell cue that plays as the bride appears (`playCue` in `src/audio/audioManager.ts`, triggered by `useCueAt`; it stays silent if sound is muted, the tab is hidden or the guest scrubs past it). Replace either by dropping in your own file with the same name (or change `src/assets/manifest.ts`). The dev overlay's `sound` line shows the AudioContext state (`running` once unlocked), so you can check a phone without devtools. On iPhone, Web Audio follows the ring/silent switch: turn silent mode off when testing.

## Scene 2 (the groom's world)

- `src/scenes/SceneGroom.tsx` sets the room down at the hero's spot, scaled so the figure stands `HERO_HEIGHT` tall. The room itself (`src/scenes/groom/`) is authored in its own units around the middle of the figure.
- Layouts are pure modules with no three.js imports (`groom/groveLayout.ts`, `groom/ribbonPath.ts`, `groom/stage.ts`), so `npm run check` can test them in Node. `groveLayout` keeps every trunk clear of the camera line.
- Solid parts (trunks, canopy, flowers, grass, ground) dissolve into the fog colour over the last 14% of the scene (`FRAG_HEAD_FADE`, `FRAG_FOG_FADE` and the `fade` option of `createFogMaterial` in `src/shared/shaders.ts`); glow layers multiply their alpha by the same fade.
- The groom's name and family line are an HTML overlay (`src/ui/overlays/PersonOverlays.tsx`, `NameReveal.tsx`), timed by `personTiming.ts`, which the guard also reads. Copy comes from `content.ts` (the family line is a placeholder).
- Lite draws nothing in this scene; the sky and the overlay are the whole thing.
- **Guard:** `npm run check` runs `scripts/check-heroes.mjs`: the figure stays centred and big enough on phone, tablet and laptop shapes while the name is up, his feet stay above the name block, and the camera on the real spline never passes closer than 3.3 m to him, 1.8 m to a trunk or canopy cluster (every tier) or 1.5 m to the flute ribbon.

## Scene 3 (the bride's world)

- `src/scenes/SceneBride.tsx` composes the shared `Water` (a pond with a rim that fades out, tinted peacock green, calmer ripples), `LotusPond`, `Petals`, `PaithaniRibbon`, the `BrideFigure` cut-out and `LowMist`. Everything is authored directly in scene-local metres at hero scale: the 1.7 m design sizes are multiplied by `POND_SCALE` (`scenes/bride/config.ts`), so the room keeps its proportions around a 6 m bride.
- Pure layouts: `bride/pondLayout.ts` (lotuses and pads, seeded, kept clear of the camera's line and out of the fog's reach when the scene mounts), `bride/ribbonPath.ts` (the ribbon winds around her far side and is high overhead where it crosses the camera's side) and `bride/stage.ts`.
- Everything solid dissolves through one shared `fade` box (`sceneFade`), the cut-out layers and petals through their own reveals; the figure is gone (0.88) before the scene's fade-out ends.
- Her name and family line use the same `NameReveal` overlay and timing as the groom's (`PersonOverlays.tsx`).
- **Guard:** `check-heroes.mjs` runs the bride through the same framing tests as the groom, and checks the true-spline distance to every lotus (1.8 m) and to the edge of the ribbon (1.2 m), and that nothing floats close enough to be visible when the scene mounts.

## Scene 1 and the shared building blocks

- **Backdrop:** `src/shared/NightSky.tsx` (gradient, moon, stars) is mounted by `Experience`, not by a scene, because scenes 1–4 all play under one sky. It draws at infinity, so the camera never gets closer to it.
- **Scene 1:** `src/scenes/SceneInvocation.tsx` composes the shared `Water` and `LowMist` and `FloatingDiyas` (in `src/scenes/invocation/`) with the shared `Fireflies`. Positions are computed on the GPU from the scene's progress, so scrolling scrubs the drift exactly.
- **Quality scaling:** star, diya, firefly and mist counts, ripple layers and bloom all scale by tier through `byTier` (`src/shared/tier.ts`). Low drops post-processing; lite draws only the sky.
- **Post-processing:** `src/core/PostFX.tsx`: bloom (only pixels brighter than 1.0 glow) plus ACES tone mapping, on high and medium.
- **Text:** `src/ui/overlays/` fades each scene's HTML text from its progress without re-rendering React. Phases 5–8 add their overlays to the registry (invocation and groom are in already) in `src/ui/overlays/registry.ts`; `SceneOverlays` mounts the one for the active scene.
- **Dev overlay:** the `render` line shows draw calls and triangles for the whole frame, post-processing passes included.
- **Guards:** `npm run check` also tests the Invocation scene against the real camera spline: the moon stays in frame on phone and desktop shapes, no floating diya passes within 1.8 m of the camera (the layout in `scenes/invocation/diyaLayout.ts` keeps them clear), enough diyas are in view at once, and the fade-out curve is intact.
- **Shared helpers:** `src/shared/` also holds `Water.tsx` (river and pond) and `LowMist.tsx` (moved from `scenes/invocation/`), `CutoutFigure.tsx` (a placeholder silhouette in three depth layers, for the bride; the groom's stack in `scenes/groom/GroomStack.tsx` does the same job with its own textures), `Drifters.tsx` (tumbling petals; feathers use `FlutterField.tsx`), `shaders.ts` (fog-aware materials and GLSL pieces), `math.ts`, `colour.ts` (token shades), `motion.ts` (reduced-motion scale), `cameraLine.ts` (the camera's local line through a scene), `Glow.tsx`, `FlutterField.tsx` and `textures.ts`.
- **Not testable without a device:** frame rate (target 45+ fps laptop, 30+ fps phone at medium), the bloom look and ripple shimmer on a real screen. Open the site with `?debug` on your phone through `npm run dev:host` and check the FPS counter and the dev overlay's `render` line.
