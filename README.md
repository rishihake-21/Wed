# Vrindavan Wedding Invitation

A phone-first, cinematic 3D wedding invitation (Marathi + English). Vite, React 18, TypeScript, React Three Fiber.

**Status: Phase 2 of 10** — entry gate with diya loader, audio, always-visible controls, device quality detection and the auto-playing Part A driver. Scenes are still placeholders (Phases 3–8).

## Run

```bash
npm install
npm run dev            # http://localhost:5173
npm run dev:host       # also reachable from your phone on the LAN address
npm run typecheck
npm run check          # layout, camera-framing and quality-rule guards; needs Node 22.6+, no other setup
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
- Only the active scene and the next one are mounted.
- Part A auto-plays `t` with a GSAP timeline (`src/core/PartADriver.tsx`, about 38 s, linear so each scene keeps its running time); Part B maps scroll to `t`. Skip and menu jumps end Part A by changing `stage`, which kills the timeline.
- Moving the camera on purpose (menu links, Skip) goes through `useAppStore.getState().jumpTo(t)`. In scroll mode the scroll position owns `t`, so writing `t` directly would be undone on the next frame.
- The vertical field of view widens on portrait screens (`fovForAspect`), so rooms stay in frame on phones. `npm run check` fails if that regresses.
- The gate (`src/ui/Gate.tsx`) unlocks audio inside the Enter tap. Audio lives in `src/audio/audioManager.ts`: one looping bed, fades, mute, pause when the tab is hidden.
- Quality tier: `src/core/environment.ts` probes WebGL2, detect-gpu, device memory and data saver once at startup; the pure rules are in `src/core/quality.ts`. The Lite button on the gate overrides it.
- All guest-facing copy lives in `src/content/content.ts` and is currently placeholder.

See `CLAUDE.md` for the rules every phase follows.

## Audio

`public/audio/bed.mp3` is a synthesised placeholder drone. Replace it by dropping in your own file with the same name (or change `src/assets/manifest.ts`). The dev overlay's `sound` line shows the AudioContext state (`running` once unlocked), so you can check a phone without devtools. On iPhone, Web Audio follows the ring/silent switch: turn silent mode off when testing.
