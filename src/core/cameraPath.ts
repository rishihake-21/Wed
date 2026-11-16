import { CatmullRomCurve3, Vector3 } from 'three';
import {
  CAMERA_WAYPOINTS,
  SCENE_ORIGINS,
  sceneIndexAt,
  sceneProgressAt,
  tToPathU,
} from './layout';

/** How far ahead along the path the camera looks while gliding. */
const LOOK_AHEAD = 12;
/** At mid-scene the gaze is pulled this far (0–1) from "straight ahead" toward the scene's origin. */
const FOCUS_WEIGHT = 0.55;
/** Height above the scene origin the camera looks at when focusing. */
const FOCUS_HEIGHT = 1.5;

// Centripetal Catmull-Rom: passes through every waypoint without looping or overshooting.
const CURVE = new CatmullRomCurve3(
  CAMERA_WAYPOINTS.map(([x, y, z]) => new Vector3(x, y, z)),
  false,
  'centripetal',
);

const tangent = new Vector3();
const focus = new Vector3();

/**
 * Samples the camera pose at master time `t`.
 *
 * Position is the spline at tToPathU(t). The gaze looks down the path, and eases toward
 * the active scene's origin in the middle of that scene (weight sin(π·progress), which is
 * 0 at both scene boundaries so the view is continuous across them).
 */
export function sampleCameraPose(t: number, outPosition: Vector3, outLookAt: Vector3): void {
  const u = tToPathU(t);
  CURVE.getPoint(u, outPosition);
  CURVE.getTangent(u, tangent);
  outLookAt.copy(outPosition).addScaledVector(tangent, LOOK_AHEAD);

  const scene = sceneIndexAt(t);
  const [ox, oy, oz] = SCENE_ORIGINS[scene];
  focus.set(ox, oy + FOCUS_HEIGHT, oz);
  outLookAt.lerp(focus, FOCUS_WEIGHT * Math.sin(Math.PI * sceneProgressAt(t, scene)));
}
