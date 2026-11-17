# Project rules (read before every phase)

Vrindavan-themed Maharashtrian wedding invitation: a cinematic, scroll-driven 3D website, phone-first. Part A is an auto-playing opening (scenes 1–4); Part B is a scroll journey (scenes 5–9).

## Stack

Vite, React 18, TypeScript, three, @react-three/fiber 8, @react-three/drei 9, zustand, Tailwind 3. gsap, howler and detect-gpu arrived in Phase 2. Added in the phase that first uses them: @react-three/postprocessing.

## Architecture contracts (frozen in Phase 1)

- One master value `t` (0–1) in the zustand store drives the journey. Part A auto-plays `t` with GSAP; Part B maps scroll to `t`.
- `src/core/layout.ts` owns time and space: `SCENE_RANGES` (slice of `t` per scene), `CAMERA_WAYPOINTS`, `SCENE_ORIGINS`, `PART_A_END_T`. It has no three.js imports.
- Each scene is one component in `src/scenes/` with props `{ progress, quality }` (`SceneProps` in `src/core/types.ts`), authored in local coordinates around its origin.
- `progress` is a ref-style box (`progress.current`, 0–1), not a number, so scenes don't re-render every frame. Read it in `useFrame` or a rAF/GSAP loop.
- Never subscribe a component to `t`; read `useAppStore.getState().t` inside `useFrame`.
- Only the active and next scene are mounted (`SceneManager`). Dispose textures you create by hand when a scene unmounts.
- To move the journey on purpose (menu links, Skip, hand-over) call `useAppStore.getState().jumpTo(t)`; entering the journey uses `startJourney(t)`. Never write `t` with `setT` for that: in journey mode the scroll position overwrites `t` every frame. A jump snaps the camera; a later phase hides the cut with a diya-light flash.
- Part A, Skip and menu links are `stage` changes in the store: `skipIntro`, `jumpToScene` (built on `jumpTo`) and `startJourney`. While `stage` is `cinematic`, only `PartADriver` writes `t`. Leaving the intro by any route ends at `startJourney`, which kills the GSAP timeline.
- Per-frame order lives in `src/core/frameOrder.ts` (input → scene progress → camera → scenes). Use those priorities, and never a positive `useFrame` priority: in R3F v8 it stops automatic rendering.
- Camera framing is tuned for portrait phones first: `fovForAspect` widens the vertical FOV, `ROOM_SIDE_OFFSET` and `focusWeight` keep rooms in frame. Run `npm run check` after touching `layout.ts` or `cameraPath.ts`.
- Fog far plane equals `SEGMENT_LENGTH`, so the next room is fully fogged when it mounts. Real scenes may change the fog, but must not let rooms pop in.
- Open decision for Phase 3: HTML overlays and lite mode cannot rely on anything that lives inside the Canvas (scene progress is synced there today). Give overlays a DOM-side registry keyed by `SceneKey`.

## Content and style

- All copy comes from `src/content/content.ts` (Marathi and English). No hard-coded guest-facing strings.
- Devanagari is always an HTML overlay, never WebGL text.
- Colours and fonts come only from `src/theme/tokens.ts`.
- Assets are referenced through `src/assets/manifest.ts` (started in Phase 2 with audio; Phase 10 adds models, textures and images); use procedural stand-ins until real files exist.

## Performance rules

- Quality tiers: `high | medium | low | lite`. Particle counts, post-processing and pixel ratio read from the quality store.
- The tier is chosen once at startup: browser probes in `src/core/environment.ts`, pure rules in `src/core/quality.ts` (covered by `npm run check`). The gate's Lite button overrides it. A tier can change after the film has started (detection may finish late), so scenes must read `quality` reactively, not once.
- Phase 10: detect-gpu downloads its GPU benchmark data from unpkg at runtime (2.5 s timeout, then the tier is "unknown"). Self-host it via `benchmarksURL` so guests on weak networks get a real answer and nothing third-party is contacted.
- No real-time shadows on mobile; at most 2 real-time lights; instanced meshes for repeated objects.
- Pixel ratio is capped per quality tier in `Experience.tsx` (1.5 for high/medium, 1 for low). The desktop cap of 2 and adaptive resolution arrive in Phase 10.

## Working style

Complete files when creating, minimal diffs when editing. Keep each change small enough to review. After a phase: run it, test on a real phone (`npm run dev:host`), commit.
