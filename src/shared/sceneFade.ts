/**
 * Scenes unmount the moment the next one becomes active, and the camera is then standing at the
 * end of the old scene's segment. Anything still in view would vanish in a single frame, so every
 * scene dissolves its own content into the background over the last stretch of its progress.
 *
 * Materials take `sceneFade(progress.current)` as a `uFade` uniform: additive things multiply
 * their output by it, opaque things mix toward the background colour. Persistent backdrops
 * (the sky) don't fade.
 */
export const FADE_OUT_START = 0.86;

/** 1 while the scene is fully present, easing to 0 at the end of its progress. */
export function sceneFade(progress: number): number {
  const k = Math.min(Math.max((progress - FADE_OUT_START) / (1 - FADE_OUT_START), 0), 1);
  return 1 - k * k * (3 - 2 * k);
}
