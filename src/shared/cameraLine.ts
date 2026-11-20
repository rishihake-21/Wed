/**
 * The camera's path through one scene as a straight line in scene-local x and z. Pure (no three.js),
 * so layouts can keep solid things off the path and `npm run check` can test them against the real
 * spline, which strays up to about half a metre from this line.
 */
import { CAMERA_WAYPOINTS, SCENE_ORIGINS } from '../core/layout';

/** Camera x, z (scene-local) at scene progress 0–1. */
export function cameraLine(scene: number, progress: number): readonly [number, number] {
  const a = CAMERA_WAYPOINTS[scene];
  const b = CAMERA_WAYPOINTS[scene + 1];
  const o = SCENE_ORIGINS[scene];
  return [a[0] + (b[0] - a[0]) * progress - o[0], a[2] + (b[2] - a[2]) * progress - o[2]];
}

/** Smallest horizontal distance from scene-local (x, z) to the camera's line, over the whole scene. */
export function distanceToCameraLine(scene: number, x: number, z: number): number {
  let closest = Infinity;
  for (let i = 0; i <= 40; i++) {
    const [cx, cz] = cameraLine(scene, i / 40);
    closest = Math.min(closest, Math.hypot(x - cx, z - cz));
  }
  return closest;
}
