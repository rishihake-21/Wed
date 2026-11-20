/** Small deterministic helpers shared by the procedural scenes. */

/** Seeded PRNG: the same seed gives the same layout on every mount (see rng.ts). */
export { mulberry32 as createRng } from './rng';

export const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** 0 below `a`, 1 above `b`, smooth in between. */
export function smoothstep(a: number, b: number, x: number): number {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

/** Shortest signed difference between two angles, in (-PI, PI]. */
export function angleDelta(from: number, to: number): number {
  const full = Math.PI * 2;
  let d = (to - from) % full;
  if (d > Math.PI) d -= full;
  if (d <= -Math.PI) d += full;
  return d;
}

export const lerpAngle = (from: number, to: number, t: number): number => from + angleDelta(from, to) * t;
