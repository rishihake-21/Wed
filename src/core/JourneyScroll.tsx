import { ScrollControls, useScroll } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { SCENE_COUNT } from './layout';
import { useAppStore } from './store';

/** Scroll distance per scene, in viewport heights. */
const VIEWPORTS_PER_SCENE = 1;

/** Copies the (already damped) scroll offset into master time: offset 0 → journeyFromT, offset 1 → 1. */
function ScrollToT() {
  const scroll = useScroll();

  useFrame(() => {
    const { journeyFromT, t, setT } = useAppStore.getState();
    const next = journeyFromT + scroll.offset * (1 - journeyFromT);
    if (Math.abs(next - t) > 1e-5) setT(next);
  });

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
