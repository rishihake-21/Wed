import { useRef } from 'react';
import { ScrollControls, useScroll } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { FRAME_PRIORITY } from './frameOrder';
import { clamp01, SCENE_COUNT } from './layout';
import { useAppStore } from './store';

/** Scroll distance per scene, in viewport heights. */
const VIEWPORTS_PER_SCENE = 1;
/** After a jump, ignore the (damped) scroll offset until it has caught up with the new position. */
const SETTLE_TOLERANCE = 0.002;
const SETTLE_TIMEOUT_MS = 3000;

/**
 * Copies the (already damped) scroll offset into master time: offset 0 → journeyFromT, offset 1 → 1.
 * Also carries out jumps: it moves the scroll container to the jump target, and meanwhile keeps
 * the `t` that jumpTo already set instead of replaying the damped sweep through every scene between.
 */
function ScrollToT() {
  const scroll = useScroll();
  const handledJump = useRef(0);
  const settling = useRef<{ offset: number; deadline: number } | null>(null);

  useFrame(() => {
    const state = useAppStore.getState();
    const { journeyFromT, jump } = state;
    const span = 1 - journeyFromT;

    if (jump && jump.id !== handledJump.current) {
      handledJump.current = jump.id;
      const offset = span > 0 ? clamp01((jump.t - journeyFromT) / span) : 0;
      const el = scroll.el;
      el.scrollTop = offset * (el.scrollHeight - el.clientHeight);
      settling.current = { offset, deadline: performance.now() + SETTLE_TIMEOUT_MS };
    }

    if (settling.current) {
      const { offset, deadline } = settling.current;
      if (Math.abs(scroll.offset - offset) > SETTLE_TOLERANCE && performance.now() < deadline) return;
      settling.current = null;
    }

    // Clamped: iOS rubber-banding can push the container's scroll position past either end.
    const next = journeyFromT + clamp01(scroll.offset) * span;
    if (Math.abs(next - state.t) > 1e-5) state.setT(next);
  }, FRAME_PRIORITY.input);

  return null;
}

/**
 * Part B: vertical scroll / touch drag drives `t`. Mount it only while stage === 'journey';
 * mounting creates a fresh scroll container, so scroll position starts at 0.
 */
export function JourneyScroll() {
  const journeyFromT = useAppStore((s) => s.journeyFromT);
  // drei's `pages` includes the first viewport, which isn't scrollable distance.
  const pages = 1 + (1 - journeyFromT) * SCENE_COUNT * VIEWPORTS_PER_SCENE;

  return (
    <ScrollControls pages={pages}>
      <ScrollToT />
    </ScrollControls>
  );
}
