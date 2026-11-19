/**
 * Where the moon sits, as plain numbers (no three.js) so `npm run check` can test it.
 *
 * 30° right of straight ahead (-z), 11° up. Scene 1's camera pans right to about 28° at
 * mid-scene, so on a phone the moon slides into frame as the camera turns. Low on purpose: a
 * low moon gives a long thin glitter column on the water; a high one gives one big blob right
 * under the camera. `npm run check` keeps it in frame for most of scene 1 on every screen shape.
 */
export const MOON_AZIMUTH = Math.PI / 6;
export const MOON_ELEVATION = (11 * Math.PI) / 180;

/** Angular radius of the moon disc, in radians. */
export const MOON_SIZE = 0.034;

/** Unit direction from the camera to the moon. */
export const MOON_DIRECTION_XYZ: readonly [number, number, number] = [
  Math.sin(MOON_AZIMUTH) * Math.cos(MOON_ELEVATION),
  Math.sin(MOON_ELEVATION),
  -Math.cos(MOON_AZIMUTH) * Math.cos(MOON_ELEVATION),
];
