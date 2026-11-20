/**
 * Where the groom's room stands in scene 2, and which way it faces. Pure (no three.js) so
 * `npm run check` can test the grove against the real camera spline.
 *
 * The room is authored around the middle of the figure (see config.ts). It is scaled up to the
 * world hero height and set down so its ground is the world's y = 0, at the hero's spot.
 */
import { HERO_HEIGHT, HERO_SPOTS, sceneIndexOf } from '../../core/layout'
import type { Vec3 } from '../../core/types'
import { cameraLine } from '../../shared/cameraLine'
import { GROOM_SCALE } from './config'

export const GROOM_SCENE = sceneIndexOf('groom')

/** The hero's feet, scene-local. */
export const GROOM_SPOT = HERO_SPOTS.groom as Vec3

/** Position of the room's root group (its origin is the middle of the figure, so half a hero up). */
export const GROOM_POSITION: Vec3 = [GROOM_SPOT[0], HERO_HEIGHT / 2, GROOM_SPOT[2]]

/**
 * Direction, radians around Y, from the hero toward where the camera comes from: the bearing to the
 * camera a third of the way through the scene, when it is still approaching. The grove keeps this
 * side clear. It comes from the camera path itself, not from wherever the camera happens to be when
 * the scene mounts (a menu jump can mount the scene with the camera anywhere).
 */
export const ARRIVAL_YAW: number = (() => {
  const [cx, cz] = cameraLine(GROOM_SCENE, 1 / 3)
  return Math.atan2(cx - GROOM_SPOT[0], cz - GROOM_SPOT[2])
})()

/** Scene-local position of a point given in the room's own (scaled) x, z. */
export function roomToScene(x: number, z: number): readonly [number, number] {
  return [GROOM_SPOT[0] + x * GROOM_SCALE, GROOM_SPOT[2] + z * GROOM_SCALE]
}
