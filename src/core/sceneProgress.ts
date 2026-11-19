import { SCENE_COUNT, sceneProgressAt } from './layout';
import { useAppStore } from './store';
import type { SceneProgress } from './types';

/** One progress box per scene, created once. Scenes receive their own box as `progress`. */
export const SCENE_PROGRESS: readonly SceneProgress[] = Array.from({ length: SCENE_COUNT }, () => ({
  current: 0,
}));

/** Recompute every scene's local progress from master time. Cheap: nine subtractions. */
export function syncSceneProgress(t: number): void {
  for (let i = 0; i < SCENE_COUNT; i++) {
    SCENE_PROGRESS[i].current = sceneProgressAt(t, i);
  }
}

let stopSync: (() => void) | null = null;

/**
 * Keeps every scene's progress box in step with `t` from a store subscription, not from a
 * per-frame callback inside the Canvas. Whatever writes `t` (the Part A timeline, the scroll
 * driver, a jump) updates the boxes in the same tick, so HTML overlays, and later a lite mode with
 * no Canvas at all, read the same numbers the scenes do. Call once at startup; safe to repeat.
 */
export function startSceneProgressSync(): void {
  if (stopSync) return;
  syncSceneProgress(useAppStore.getState().t);
  stopSync = useAppStore.subscribe((state, previous) => {
    if (state.t !== previous.t) syncSceneProgress(state.t);
  });
}
