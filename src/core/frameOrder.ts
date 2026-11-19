/**
 * Order of per-frame work. R3F runs `useFrame` callbacks from the lowest priority number up,
 * then renders. Everything that feeds a frame uses a negative priority so it runs before
 * scene code (priority 0) and all of it sees the same `t`.
 *
 * Never use a POSITIVE priority: in R3F v8 that makes you responsible for rendering and the
 * automatic render stops.
 *
 * Order: input (scroll → t) → camera → scenes. Scene progress needs no slot: it is recomputed from a
 * store subscription (core/sceneProgress.ts) the moment `t` changes.
 */
export const FRAME_PRIORITY = {
  input: -3,
  camera: -1,
} as const;
