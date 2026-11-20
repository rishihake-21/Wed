/**
 * The groom's and the bride's name reveals share one rhythm because the camera does: it holds its
 * gaze on the hero from 0.2 to 0.68 of the scene (core/layout.ts SCENE_GAZE), the figure is about a
 * quarter of a phone screen's height by 0.5, and the camera sweeps past from about 0.75. The name
 * arrives while the hero is in frame and is gone before the scene dissolves (sceneFade, from 0.86).
 * Pure data, so `npm run check` can test it against the camera.
 */
export const PERSON_TIMING = {
  /** The gold name sweeps in across this progress range. */
  name: [0.34, 0.5],
  /** The family line fades in over this range. */
  family: [0.46, 0.6],
  /** Everything fades out over this range. */
  out: [0.74, 0.84],
} as const;
