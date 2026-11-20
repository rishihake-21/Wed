import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { SceneProgress } from '../core/types';
import { playCue } from './audioManager';
import type { CueName } from './audioManager';

/** A jump of more than this much progress in one frame is a scrub or a menu jump, not playback. */
const MAX_STEP = 0.2;

/**
 * Plays a sound cue when a scene's progress crosses `at` on its way forward. Call it inside a
 * scene component. It stays quiet if progress leaps past `at` in one frame (a scrub), and
 * re-arms if progress goes back before it.
 */
export function useCueAt(progress: SceneProgress, at: number, cue: CueName): void {
  const last = useRef(progress.current);

  useFrame(() => {
    const p = progress.current;
    if (last.current < at && p >= at && p - last.current < MAX_STEP) playCue(cue);
    last.current = p;
  });
}
