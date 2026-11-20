/**
 * Where the floating diyas start, in scene-local coordinates. Pure (no three.js) so
 * `npm run check` can test it against the real camera spline.
 *
 * The camera glides down the river from local (-5, 1.0, +15) to (-3, 1.4, -15) while the diyas
 * drift toward it (+z) at their own pace, so a diya's whole path is tested against the camera's:
 * none may pass closer than DIYA_CAMERA_CLEARANCE, or its bowl would fill the lens.
 */
import { cameraLine } from '../../shared/cameraLine';
import { mulberry32 } from '../../shared/rng';

/** Floating diyas per quality tier (lite draws none). */
export const DIYA_COUNT = { high: 36, medium: 24, low: 12 } as const;

/** Running time of the scene in seconds (PART_A_SCENE_SECONDS[0]); the drift is metres per second of it. */
export const DIYA_SCENE_SECONDS = 8;

/** Sideways sway of a diya, in metres either way (the shader adds sin(...) * this to x). */
export const DIYA_SWAY = 0.25;

/**
 * Horizontal distance the layout keeps between every diya and the camera's straight-line path.
 * The real spline strays up to about 0.5 m from that line and the sway adds 0.25, so the true
 * horizontal gap is at least ~1.6 m, and with the camera 1+ m above the water the true distance
 * is at least ~1.9 m. The check script measures this against the real spline.
 */
export const DIYA_CAMERA_CLEARANCE = 2.4;

/**
 * The hero of the scene: a tight cluster of diyas where the camera looks at mid-scene (the gaze
 * is drawn toward the scene origin, with the camera turned about 28° right). One large diya
 * ringed by smaller ones that barely drift.
 */
export const CLUSTER_CENTER = [1.5, -9] as const;
export const CLUSTER_RADIUS = [1.3, 2.6] as const;

/** Smallest horizontal gap between a drifting diya and the camera's line over the whole scene. */
export function closestApproach(x: number, z: number, speed: number): number {
  let closest = Infinity;
  for (let i = 0; i <= 40; i++) {
    const progress = i / 40;
    const [cx, cz] = cameraLine(0, progress);
    closest = Math.min(closest, Math.hypot(x - cx, z + DIYA_SCENE_SECONDS * progress * speed - cz));
  }
  return closest;
}

export interface DiyaLayout {
  /** x, (unused), z per diya. */
  base: Float32Array;
  /** phase, drift speed (m/s), scale per diya. */
  misc: Float32Array;
}

export function diyaLayout(count: number): DiyaLayout {
  const rand = mulberry32(2026);
  const base = new Float32Array(count * 3);
  const misc = new Float32Array(count * 3);
  const cluster = Math.round(count * 0.3);

  for (let i = 0; i < count; i++) {
    if (i < cluster) {
      const first = i === 0;
      const angle = (i / Math.max(cluster - 1, 1)) * Math.PI * 2 + rand() * 0.5;
      const radius = first ? 0 : CLUSTER_RADIUS[0] + rand() * (CLUSTER_RADIUS[1] - CLUSTER_RADIUS[0]);
      base.set([CLUSTER_CENTER[0] + Math.cos(angle) * radius, 0, CLUSTER_CENTER[1] + Math.sin(angle) * radius], i * 3);
      misc.set([rand() * 6.283, 0.1 + rand() * 0.1, first ? 1.9 : 1.1 + rand() * 0.35], i * 3);
    } else {
      // Along the river: try places until one stays clear of the camera's whole path.
      for (let attempt = 0; attempt < 200; attempt++) {
        const x = -6 + (rand() - 0.4) * 26;
        const z = -52 + rand() * 76;
        const speed = 0.55 + rand() * 0.7;
        const phase = rand() * 6.283;
        const scale = 1.1 + rand() * 0.5;
        if (closestApproach(x, z, speed) >= DIYA_CAMERA_CLEARANCE || attempt === 199) {
          base.set([x, 0, z], i * 3);
          misc.set([phase, speed, scale], i * 3);
          break;
        }
      }
    }
  }
  return { base, misc };
}
