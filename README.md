# Vrindavan Wedding Invitation

A phone-first, cinematic 3D wedding invitation (Marathi + English). Vite, React 18, TypeScript, React Three Fiber.

**Status: Phase 3 of 10** — Scene 1 (Invocation, the Yamuna at night) is built: night sky with moon and stars, shader water with a moon glint, floating diyas, fireflies, low mist, selective bloom and the HTML invocation text. Scenes 2–9 are still placeholders (Phases 4–8). Phase 2 added the gate, audio, controls, quality detection and the Part A driver.

## Run

```bash
npm install
npm run dev            # http://localhost:5173
npm run dev:host       # also reachable from your phone on the LAN address
npm run typecheck
npm run check          # layout, camera-framing, quality-rule and Invocation-scene guards; needs Node 22.6+, no other setup
```

Developer URL switches:

| URL | Effect |
| --- | --- |
| `?stage=journey` | Skip the gate (and so the sound) and start scrolling through all nine placeholder scenes |
| `?quality=low` | Force a quality tier: `high`, `medium`, `low`, `lite` |
| `?debug` | Show the FPS counter and debug overlay (always on under `npm run dev`) |

## How it fits together

- One master value `t` (0–1) drives everything. Scene `i` owns a slice of `t` (`SCENE_RANGES` in `src/core/layout.ts`) and receives its own local `progress` (0–1).
- The camera follows one Catmull-Rom spline through `CAMERA_WAYPOINTS`; scene `i` covers the segment between waypoint `i` and `i + 1`.
- Only the active scene and the next one are mounted. A scene unmounts as soon as the next is active, so each scene dissolves its own content over the last 14% of its progress (`sceneFade`); only the sky persists.
- Scene progress follows `t` through a store subscription (`startSceneProgressSync` in `src/core/sceneProgress.ts`), not through the Canvas, so HTML overlays and lite mode work without one.
- Part A auto-plays `t` with a GSAP timeline (`src/core/PartADriver.tsx`, about 38 s, linear so each scene keeps its running time); Part B maps scroll to `t`. Skip and menu jumps end Part A by changing `stage`, which kills the timeline.
- Moving the camera on purpose (menu links, Skip) goes through `useAppStore.getState().jumpTo(t)`. In scroll mode the scroll position owns `t`, so writing `t` directly would be undone on the next frame.
- The vertical field of view widens on portrait screens (`fovForAspect`), so rooms stay in frame on phones. `npm run check` fails if that regresses.
- The gate (`src/ui/Gate.tsx`) unlocks audio inside the Enter tap. Audio lives in `src/audio/audioManager.ts`: one looping bed, fades, mute, pause when the tab is hidden.
- Quality tier: `src/core/environment.ts` probes WebGL2, detect-gpu, device memory and data saver once at startup; the pure rules are in `src/core/quality.ts`. The Lite button on the gate overrides it.
- All guest-facing copy lives in `src/content/content.ts` and is currently placeholder.

See `CLAUDE.md` for the rules every phase follows.

## Audio

`public/audio/bed.mp3` is a synthesised placeholder drone. Replace it by dropping in your own file with the same name (or change `src/assets/manifest.ts`). The dev overlay's `sound` line shows the AudioContext state (`running` once unlocked), so you can check a phone without devtools. On iPhone, Web Audio follows the ring/silent switch: turn silent mode off when testing.

## Scene 1 and the shared building blocks

- **Backdrop:** `src/shared/NightSky.tsx` (gradient, moon, stars) is mounted by `Experience`, not by a scene, because scenes 1–4 all play under one sky. It draws at infinity, so the camera never gets closer to it.
- **Scene 1:** `src/scenes/SceneInvocation.tsx` composes `YamunaWater`, `FloatingDiyas` and `LowMist` (in `src/scenes/invocation/`) with the shared `Fireflies`. Positions are computed on the GPU from the scene's progress, so scrolling scrubs the drift exactly.
- **Quality scaling:** star, diya, firefly and mist counts, ripple layers and bloom all scale by tier through `byTier` (`src/shared/tier.ts`). Low drops post-processing; lite draws only the sky.
- **Post-processing:** `src/core/PostFX.tsx`: bloom (only pixels brighter than 1.0 glow) plus ACES tone mapping, on high and medium.
- **Text:** `src/ui/overlays/` fades each scene's HTML text from its progress without re-rendering React. Phases 4–8 add their overlays to the registry in `src/ui/overlays/registry.ts`; `SceneOverlays` mounts the one for the active scene.
- **Dev overlay:** the `render` line shows draw calls and triangles for the whole frame, post-processing passes included.
- **Guards:** `npm run check` also tests the Invocation scene against the real camera spline: the moon stays in frame on phone and desktop shapes, no floating diya passes within 1.8 m of the camera (the layout in `scenes/invocation/diyaLayout.ts` keeps them clear), enough diyas are in view at once, and the fade-out curve is intact.
- **Not testable without a device:** frame rate (target 45+ fps laptop, 30+ fps phone at medium), the bloom look and ripple shimmer on a real screen. Open the site with `?debug` on your phone through `npm run dev:host` and check the FPS counter and the dev overlay's `render` line.
