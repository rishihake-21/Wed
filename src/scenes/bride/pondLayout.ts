/**
 * Where the lotuses and lily pads float. Pure (no three.js): `npm run check` tests it against the real
 * camera spline, and it uses the seeded generator so the pond looks the same on every device.
 *
 * All positions are scene-local metres. A first share of the lotuses ring the bride; the rest are
 * scattered over the pond. Nothing floats within `clearCamera` of the camera's line, within the fog's
 * reach of where the camera starts, or off the water.
 */
import { SEGMENT_LENGTH } from '../../core/layout';
import { distanceToCameraLine } from '../../shared/cameraLine';
import { mulberry32 } from '../../shared/rng';
import { BRIDE_SCENE, BRIDE_SPOT, POND_CENTRE, POND_RADIUS } from './stage';
import { POND_SCALE, type BrideBudget } from './config';

export interface Placement {
  x: number;
  z: number;
  /** Multiplier on the lotus or pad as authored (petal length 0.16–0.46, pad radius 0.5). */
  scale: number;
  phase: number;
  yaw: number;
}

export interface PondLayout {
  lotuses: Placement[];
  pads: Placement[];
}

/** Keeps floating things on the water proper: inside the part of the pond that has not faded to horizon. */
const SCATTER_RADIUS = POND_RADIUS * 0.8;

/**
 * The camera starts this far (scene-local z) in front of the scene's middle; the next scene mounts with
 * the camera one segment further back, so anything at or below this z is beyond the fog when it mounts.
 */
export const NEAREST_Z = SEGMENT_LENGTH / 2;

/** The widest a lotus reaches from its middle, as a share of its scale (petal length x lean). */
export const LOTUS_REACH = 0.5;
/** How high a lotus stands above the water, as a share of its scale (a closed bud is the tallest). */
export const LOTUS_HEIGHT = 0.5;

const LOTUS_SCALE = [0.8 * POND_SCALE, 1.25 * POND_SCALE] as const;
const PAD_SCALE = [0.7 * POND_SCALE, 1.3 * POND_SCALE] as const;

interface ScatterOptions {
  ring: number;
  spacing: number;
  clearHero: number;
  clearCamera: number;
  scale: readonly [number, number];
  avoid?: readonly Placement[];
}

function scatter(count: number, rand: () => number, opts: ScatterOptions): Placement[] {
  const out: Placement[] = [];
  const [hx, , hz] = BRIDE_SPOT;
  const [cx, cz] = POND_CENTRE;
  const free = (x: number, z: number, r: number) =>
    out.every((o) => Math.hypot(o.x - x, o.z - z) > opts.spacing) &&
    (opts.avoid ?? []).every((o) => Math.hypot(o.x - x, o.z - z) > o.scale * 0.55 + r);
  const ok = (x: number, z: number, scale: number) =>
    Math.hypot(x - cx, z - cz) <= SCATTER_RADIUS &&
    z + scale * LOTUS_REACH <= NEAREST_Z &&
    distanceToCameraLine(BRIDE_SCENE, x, z) >= opts.clearCamera;

  // A ring around the bride. Where the ring would cross the camera's line it simply has a gap.
  for (let i = 0; i < opts.ring; i++) {
    const angle = (i / opts.ring) * Math.PI * 2 + rand() * 0.4;
    const radius = (1.35 + rand() * 1.6) * POND_SCALE;
    const scale = opts.scale[0] + rand() * (opts.scale[1] - opts.scale[0]);
    const x = hx + Math.cos(angle) * radius;
    const z = hz + Math.sin(angle) * radius;
    if (ok(x, z, scale)) out.push({ x, z, scale, phase: rand(), yaw: rand() * 6.283 });
  }
  for (let tries = 0; out.length < count && tries < count * 80; tries++) {
    const angle = rand() * Math.PI * 2;
    const radius = Math.sqrt(rand()) * SCATTER_RADIUS;
    const x = cx + Math.cos(angle) * radius;
    const z = cz + Math.sin(angle) * radius;
    const scale = opts.scale[0] + rand() * (opts.scale[1] - opts.scale[0]);
    if (Math.hypot(x - hx, z - hz) < opts.clearHero) continue;
    if (!ok(x, z, scale) || !free(x, z, scale * 0.5)) continue;
    out.push({ x, z, scale, phase: rand(), yaw: rand() * 6.283 });
  }
  return out;
}

export function pondLayout(budget: Pick<BrideBudget, 'lotuses' | 'pads'>): PondLayout {
  const rand = mulberry32(1008);
  const lotuses = scatter(budget.lotuses, rand, {
    ring: Math.round(budget.lotuses * 0.45),
    spacing: 1.5 * POND_SCALE,
    clearHero: 1.9 * POND_SCALE,
    clearCamera: 1.5 * POND_SCALE,
    scale: LOTUS_SCALE,
  });
  const pads = scatter(budget.pads, rand, {
    ring: 0,
    spacing: 0.9 * POND_SCALE,
    clearHero: 0.9 * POND_SCALE,
    clearCamera: 0.45 * POND_SCALE,
    scale: PAD_SCALE,
    avoid: lotuses,
  });
  return { lotuses, pads };
}
