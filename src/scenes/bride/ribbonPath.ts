/**
 * The Paithani ribbon's path, in metres relative to the bride's feet (x toward the camera's side of her,
 * z toward where the camera arrives from, y up). Pure (no three.js), so `npm run check` can test it.
 *
 * It sweeps in low from the far left across the pond, winds once around the FAR side of her, rising,
 * and leaves up and away behind her. The camera arrives on the near side and passes about 3.5 m from
 * her, so the part of the ribbon that crosses the camera's side of her is high above its head.
 */
import type { Vec3 } from '../../core/types';

/** Ribbon width, and the length of one repeat of its pattern along it, in metres. */
export const RIBBON_WIDTH = 1.5;
export const RIBBON_TILE = 2.12;

const STEPS = 9;

export function ribbonPoints(): Vec3[] {
  const points: Vec3[] = [
    [-27, 1.1, 13],
    [-20, 1.7, 8],
    [-13, 1.4, 3],
  ];
  // One slow turn: from her left (angle PI), around her back (3PI/2), to her right and a little past it.
  // Radius and height both grow, so the ribbon is a tight spiral at her feet and a wide one overhead.
  for (let i = 0; i <= STEPS; i++) {
    const k = i / STEPS;
    const angle = Math.PI + k * Math.PI * 1.25;
    const radius = 2.6 + 0.9 * k;
    points.push([Math.cos(angle) * radius, 0.9 + 6.4 * k, Math.sin(angle) * radius]);
  }
  points.push([7, 9.6, -7], [13, 11.6, -15]);
  return points;
}
