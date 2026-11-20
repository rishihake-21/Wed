# Project rules (read before every phase)

Vrindavan-themed Maharashtrian wedding invitation: a cinematic, scroll-driven 3D website, phone-first. Part A is an auto-playing opening (scenes 1–4); Part B is a scroll journey (scenes 5–9).

## Stack

Vite, React 18, TypeScript, three, @react-three/fiber 8, @react-three/drei 9, zustand, Tailwind 3. gsap, howler and detect-gpu arrived in Phase 2, @react-three/postprocessing in Phase 3.

## Architecture contracts (frozen in Phase 1)

- One master value `t` (0–1) in the zustand store drives the journey. Part A auto-plays `t` with GSAP; Part B maps scroll to `t`.
- `src/core/layout.ts` owns time and space: `SCENE_RANGES` (slice of `t` per scene), `CAMERA_WAYPOINTS`, `SCENE_ORIGINS`, `PART_A_END_T`. It has no three.js imports.
- Each scene is one component in `src/scenes/` with props `{ progress, quality }` (`SceneProps` in `src/core/types.ts`), authored in local coordinates around its origin.
- `progress` is a ref-style box (`progress.current`, 0–1), not a number, so scenes don't re-render every frame. Read it in `useFrame` or a rAF/GSAP loop.
- Never subscribe a component to `t`; read `useAppStore.getState().t` inside `useFrame`.
- Only the active and next scene are mounted (`SceneManager`). Dispose textures you create by hand when a scene unmounts.
- A scene unmounts the moment the next one becomes active, so anything still in view would pop out. Every scene must dissolve its own content over the last part of its `progress` (`sceneFade` in `src/shared/sceneFade.ts`, fed to a `uFade` uniform, starting at `FADE_OUT_START`). The persistent sky is the only thing that stays. `npm run check` guards the curve.
- Scene `progress` follows `t` through `startSceneProgressSync()` in `src/core/sceneProgress.ts` (called from `main.tsx`, a store subscription), not through anything in the Canvas. HTML overlays and lite mode can therefore read `SCENE_PROGRESS[i]` with no Canvas mounted.
- To move the journey on purpose (menu links, Skip, hand-over) call `useAppStore.getState().jumpTo(t)`; entering the journey uses `startJourney(t)`. Never write `t` with `setT` for that: in journey mode the scroll position overwrites `t` every frame. A jump snaps the camera; a later phase hides the cut with a diya-light flash.
- Part A, Skip and menu links are `stage` changes in the store: `skipIntro`, `jumpToScene` (built on `jumpTo`) and `startJourney`. While `stage` is `cinematic`, only `PartADriver` writes `t`. Leaving the intro by any route ends at `startJourney`, which kills the GSAP timeline.
- Per-frame order lives in `src/core/frameOrder.ts` (input → camera → scenes; scene progress is synced by the store subscription, not per frame). Use those priorities, and never a positive `useFrame` priority: in R3F v8 it stops automatic rendering.
- Camera framing is tuned for portrait phones first: `fovForAspect` widens the vertical FOV, `ROOM_SIDE_OFFSET` and `gazeWeight` (per-scene `SCENE_GAZE`) keep rooms in frame. Run `npm run check` after touching `layout.ts` or `cameraPath.ts`.
- Hero scenes (2 groom, 3 bride): `HERO_SPOTS`, `HERO_HEIGHT` (6 m), `HERO_GAZE_HEIGHT` and a `hold` gaze in `SCENE_GAZE` keep the camera on one figure from 0.2 to 0.68 of the scene. Heroes are monumental on purpose (the camera can't turn faster than the Part A limit, so it can't be allowed close). Author the room in its own units and set it down at the hero's spot with `scale = HERO_HEIGHT / figureHeight`; never move the camera path for a scene. `npm run check` (check-heroes.mjs) holds framing, name-block clearance and camera clearance to trunks, canopy and ribbon.
- Fog far plane equals `SEGMENT_LENGTH`, so the next room is fully fogged when it mounts. Real scenes may change the fog, but must not let rooms pop in.
- HTML overlays live in a DOM-side registry keyed by `SceneKey` (`src/ui/overlays/registry.ts`). Nothing an overlay needs may live inside the Canvas.

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

## Scenes and shared building blocks

- The sky is a persistent backdrop (`src/shared/NightSky.tsx`, mounted in Experience), not part of any scene. Scenes add foreground only. Reuse `src/shared/` (`createInstanced`, `GLSL_NOISE`, `GLSL_BILLBOARD`, `byTier`, `Fireflies`, `mulberry32`, and from Phase 4 `createFogMaterial` and the GLSL fog pieces in `shaders.ts`, `Glow`, `FlutterField`, `colour.ts`, `motion.ts`, `math.ts`, `cameraLine.ts`) before writing new helpers.
- Procedural layouts use the seeded `mulberry32` (`src/shared/rng.ts`), never `Math.random`, so a scene looks the same on every device and can be tested. Keep layout maths in a pure module with no three.js imports (like `scenes/invocation/diyaLayout.ts`) and put a guard for it in `scripts/`.
- Shader materials output values above 1.0 for anything that should glow (flames, moon); PostFX blooms only those and tone-maps the frame on high and medium. Opaque shaders (sky dome, water, diya bowls) end with `tonemapping_fragment` and `colorspace_fragment`. Blended glow layers (stars, flames, reflections, fireflies, mist) leave them out on purpose: on the composer path PostFX tone-maps and encodes the whole frame once, and the low tier writes them as they are.
- Solid surfaces dissolve with `FRAG_HEAD_FADE` + `FRAG_FOG_FADE` and `createFogMaterial({ fade })` (they mix into the fog colour, the colour of the empty space behind them); glow and blended layers multiply their alpha by the scene's fade or a reveal that reaches 0 before the unmount. `FRAG_END_ADD` is empty on purpose (glow layers skip tone mapping and encoding, see above).
- Scene text is an HTML overlay in `src/ui/overlays/`, registered in `registry.ts` and faded with `useFadeWindow` from the scene's `progress`. Text is large (24px and up), so it must keep at least 3:1 contrast over the brightest part of its scene; the Invocation text is cream on a dark scrim for that reason.
- `npm run check` runs the layout, framing, quality, invocation and hero guards in Node (22.6+, type stripping plus the small resolve hook in `scripts/lib/`). Run it after touching `layout.ts`, `cameraPath.ts`, the diya layout, the grove or ribbon layout, the name timing (`ui/overlays/personTiming.ts`) or the fade curve.
