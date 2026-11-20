/**
 * Where the bride stands in scene 3 and which way the camera arrives from. Pure (no three.js), so
 * `npm run check` can test the pond and the ribbon against the real camera spline.
 *
 * Scene 3 mirrors scene 2: the camera path weaves to the other side and so does the hero
 * (core/layout.ts HERO_SPOTS). Unlike the groom's room, the pond is authored directly in scene-local
 * metres at hero scale (see config.ts POND_SCALE), so there is no scaled root group.
 */
import { HERO_SPOTS, sceneIndexOf } from '../../core/layout';
import type { Vec3 } from '../../core/types';
import { cameraLine } from '../../shared/cameraLine';

export const BRIDE_SCENE = sceneIndexOf('bride');

/** The bride's feet, scene-local. */
export const BRIDE_SPOT = HERO_SPOTS.bride as Vec3;

/**
 * Direction, radians around Y, from the bride toward where the camera comes from: the bearing to the
 * camera a third of the way through the scene, while it is still approaching. It comes from the camera
 * path itself, not from wherever the camera happens to be when the scene mounts.
 */
export const ARRIVAL_YAW: number = (() => {
  const [cx, cz] = cameraLine(BRIDE_SCENE, 1 / 3);
  return Math.atan2(cx - BRIDE_SPOT[0], cz - BRIDE_SPOT[2]);
})();

/** Centre and radius of the pond's water (scene-local). It stops short of z = 15, where the camera starts. */
export const POND_CENTRE: readonly [number, number] = [-4, -17];
export const POND_RADIUS = 30;
