import { Color, Vector3 } from 'three';
import { colors } from '../theme/tokens';
import { MOON_DIRECTION_XYZ, MOON_SIZE } from './moon';

export { MOON_SIZE };

/** Unit direction from the camera to the moon (see moon.ts for why it sits where it does). */
export const MOON_DIRECTION = new Vector3(...MOON_DIRECTION_XYZ);

const midnight = new Color(colors.midnight);

/**
 * Sky palette, derived from the theme tokens. The horizon equals the scene fog colour
 * (midnight) so fogged water and the sky meet without a visible line.
 */
export const SKY = {
  horizon: midnight.clone(),
  band: midnight.clone().lerp(new Color(colors.yamuna), 0.3),
  zenith: midnight.clone().multiplyScalar(0.45),
  moon: new Color(colors.cream),
} as const;
