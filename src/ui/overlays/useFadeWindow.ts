import { useEffect, useRef } from 'react';
import { clamp01 } from '../../core/layout';
import { useAppStore } from '../../core/store';
import type { SceneProgress } from '../../core/types';

export interface FadeWindow {
  /** Progress range over which the element fades in, e.g. [0.12, 0.28]. */
  in: readonly [number, number];
  /** Progress range over which it fades out again. Omit to stay visible. */
  out?: readonly [number, number];
}

const smooth = (from: number, to: number, p: number) => {
  const x = clamp01((p - from) / (to - from));
  return x * x * (3 - 2 * x);
};

/**
 * Fades an HTML element in and out as a scene plays, straight from the scene's progress box.
 * It writes `opacity` and `transform` on the DOM node every frame, so there are no React
 * re-renders while a scene runs. Reduced motion keeps the fade and drops the rise.
 *
 * Usage: `const ref = useFadeWindow<HTMLDivElement>(SCENE_PROGRESS[0], { in: [0.1, 0.25] })`
 * then `<div ref={ref} style={{ opacity: 0 }}>`.
 */
export function useFadeWindow<T extends HTMLElement>(progress: SceneProgress, window_: FadeWindow) {
  const ref = useRef<T>(null);
  const [inFrom, inTo] = window_.in;
  const outFrom = window_.out?.[0];
  const outTo = window_.out?.[1];

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const el = ref.current;
      if (el) {
        const p = progress.current;
        const fadeIn = smooth(inFrom, inTo, p);
        const fadeOut = outFrom !== undefined && outTo !== undefined ? 1 - smooth(outFrom, outTo, p) : 1;
        el.style.opacity = (fadeIn * fadeOut).toFixed(3);
        el.style.transform = useAppStore.getState().reducedMotion ? 'none' : `translateY(${((1 - fadeIn) * 12).toFixed(1)}px)`;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [progress, inFrom, inTo, outFrom, outTo]);

  return ref;
}

/**
 * Drives a CSS variable `--reveal` (0 → 1) on an element from a scene's progress, for wipe
 * effects such as a gold sweep across a name. Like useFadeWindow it touches only the DOM node,
 * so nothing re-renders while the scene plays.
 */
export function useRevealSweep<T extends HTMLElement>(progress: SceneProgress, range: readonly [number, number]) {
  const ref = useRef<T>(null);
  const [from, to] = range;

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      ref.current?.style.setProperty('--reveal', smooth(from, to, progress.current).toFixed(3));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [progress, from, to]);

  return ref;
}
