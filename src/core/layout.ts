/**
 * Journey layout: the single place that decides where scenes sit in time (`t`)
 * and in space (world coordinates). Pure data and maths — no three.js imports —
 * so it can be reasoned about and tested without a renderer.
 *
 * Model
 *  - One master value `t` (0–1) drives everything.
 *  - Scene i owns the slice SCENE_RANGES[i] of `t`; inside it, the scene sees its own
 *    local progress 0–1.
 *  - The camera follows one spline through CAMERA_WAYPOINTS. Scene i covers the spline
 *    segment between waypoint i and waypoint i + 1.
 *  - A scene is authored in local coordinates around SCENE_ORIGINS[i].
 */

import type { Vec3 } from './types';

// ---------------------------------------------------------------------------
// Scenes
// ---------------------------------------------------------------------------

export const SCENE_COUNT = 9;

export type SceneKey =
  | 'invocation'
  | 'groom'
  | 'bride'
  | 'union'
  | 'date'
  | 'venue'
  | 'schedule'
  | 'families'
  | 'rsvp';

export interface SceneMeta {
  readonly key: SceneKey;
  /** Developer-facing label for placeholders and the debug overlay (not guest copy). */
  readonly label: string;
  readonly part: 'A' | 'B';
}

/** Scene numbers in the spec are 1-based (Scene 1 = Invocation); array indices here are 0-based. */
export const SCENE_META: readonly SceneMeta[] = [
  { key: 'invocation', label: 'Invocation', part: 'A' },
  { key: 'groom', label: "Groom's world", part: 'A' },
  { key: 'bride', label: "Bride's world", part: 'A' },
  { key: 'union', label: 'Union', part: 'A' },
  { key: 'date', label: 'Date', part: 'B' },
  { key: 'venue', label: 'Venue', part: 'B' },
  { key: 'schedule', label: 'Schedule', part: 'B' },
  { key: 'families', label: 'Families', part: 'B' },
  { key: 'rsvp', label: 'RSVP', part: 'B' },
];

export function sceneIndexOf(key: SceneKey): number {
  return SCENE_META.findIndex((m) => m.key === key);
}

// ---------------------------------------------------------------------------
// Time: how `t` is divided between scenes
// ---------------------------------------------------------------------------

export const PART_A_SCENES = 4;

/** Intended running time of scenes 1–4 (invocation, groom, bride, union), in seconds. */
export const PART_A_SCENE_SECONDS = [8, 10, 10, 10] as const;
export const PART_A_DURATION_S: number = PART_A_SCENE_SECONDS.reduce((a, b) => a + b, 0);

/** The `t` value where Part A ends and the scroll journey (Part B) begins. */
export const PART_A_END_T = 0.4;

function buildBoundaries(): number[] {
  const b: number[] = [0];

  // Part A: each scene gets a share of [0, PART_A_END_T] proportional to its running time.
  let elapsed = 0;
  for (const seconds of PART_A_SCENE_SECONDS) {
    elapsed += seconds;
    b.push((PART_A_END_T * elapsed) / PART_A_DURATION_S);
  }
  b[PART_A_SCENES] = PART_A_END_T; // exact, no float drift

  // Part B: equal shares of [PART_A_END_T, 1].
  const partBScenes = SCENE_COUNT - PART_A_SCENES;
  for (let j = 1; j <= partBScenes; j++) {
    b.push(PART_A_END_T + ((1 - PART_A_END_T) * j) / partBScenes);
  }
  b[SCENE_COUNT] = 1;

  return b;
}

const BOUNDARIES = buildBoundaries();

/** [start, end] of `t` for each scene. Contiguous; first starts at 0, last ends at 1. */
export const SCENE_RANGES: readonly (readonly [number, number])[] = SCENE_META.map(
  (_, i) => [BOUNDARIES[i], BOUNDARIES[i + 1]] as const,
);

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Index of the scene that owns `t`. t = 1 belongs to the last scene. */
export function sceneIndexAt(t: number): number {
  const c = clamp01(t);
  for (let i = 0; i < SCENE_COUNT - 1; i++) {
    if (c < SCENE_RANGES[i][1]) return i;
  }
  return SCENE_COUNT - 1;
}

/** Local progress (0–1) of scene `i` at master time `t`; clamped outside its range. */
export function sceneProgressAt(t: number, i: number): number {
  const [start, end] = SCENE_RANGES[i];
  return clamp01((t - start) / (end - start));
}

/** The `t` at which scene `i` begins — used by menu jump links. */
export function sceneStartT(i: number): number {
  return SCENE_RANGES[i][0];
}

/** Scenes that should be mounted at `t`: the active one and the one after it (so it can preload). */
export function mountedSceneIndices(active: number): number[] {
  return active + 1 < SCENE_COUNT ? [active, active + 1] : [active];
}

// ---------------------------------------------------------------------------
// Space: camera path and scene origins (world units, y up, journey runs toward -z)
// ---------------------------------------------------------------------------

/** Camera travel per scene along z. Also the spacing between scene origins. */
export const SEGMENT_LENGTH = 30;

/** How far to the side of the camera path each scene's origin sits. Alternates left/right. */
export const ROOM_SIDE_OFFSET = 6;

// Placeholder waypoints: a gentle weave in x, and a height that rises toward the grove
// and again toward the date lotus. Real scenes retune these.
const CAMERA_X = [0, 2, -2, 2, -2, 2, -2, 2, -2, 0];
const CAMERA_Y = [1.0, 1.4, 2.4, 2.0, 2.2, 3.0, 2.4, 2.4, 2.0, 2.0];

/** SCENE_COUNT + 1 world-space camera positions. Scene i runs from waypoint i to waypoint i + 1. */
export const CAMERA_WAYPOINTS: readonly Vec3[] = CAMERA_X.map(
  (x, i) => [x, CAMERA_Y[i], 0 - i * SEGMENT_LENGTH] as const,
);

/** World-space origin of each scene: halfway along its camera segment, offset to alternating sides. */
export const SCENE_ORIGINS: readonly Vec3[] = SCENE_META.map((_, i) => {
  const a = CAMERA_WAYPOINTS[i];
  const b = CAMERA_WAYPOINTS[i + 1];
  const side = i % 2 === 0 ? 1 : -1;
  return [(a[0] + b[0]) / 2 + side * ROOM_SIDE_OFFSET, 0, (a[2] + b[2]) / 2] as const;
});

/**
 * Maps master time `t` to the spline parameter u (0–1) for a CatmullRomCurve3 built
 * from CAMERA_WAYPOINTS. three.js gives every segment between control points an equal
 * share of u, so scene i occupies u ∈ [i / SCENE_COUNT, (i + 1) / SCENE_COUNT] —
 * regardless of how wide its slice of `t` is.
 */
export function tToPathU(t: number): number {
  const c = clamp01(t);
  const i = sceneIndexAt(c);
  return (i + sceneProgressAt(c, i)) / SCENE_COUNT;
}
