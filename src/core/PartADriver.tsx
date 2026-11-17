import { useEffect } from 'react';
import gsap from 'gsap';
import { PART_A_DURATION_S, PART_A_END_T } from './layout';
import { useAppStore } from './store';

/**
 * Part A driver: while stage === 'cinematic', a GSAP timeline plays master time `t`
 * from 0 to PART_A_END_T over PART_A_DURATION_S, then hands over to scroll.
 *
 * The ease is linear on purpose: SCENE_RANGES gives each scene a slice of `t` proportional
 * to its running time, so linear playback keeps every scene at its intended length
 * (8 s, 10 s, 10 s, 10 s) and a scene's local `progress` is also linear in time.
 *
 * Skip and menu jumps need no special case here. They change `stage` away from
 * 'cinematic', which runs the effect cleanup and kills the timeline.
 *
 * Renders nothing; it lives in the DOM tree, outside the Canvas, because GSAP has its own ticker.
 */
export function PartADriver() {
  const stage = useAppStore((s) => s.stage);

  useEffect(() => {
    if (stage !== 'cinematic') return;

    const { setT, startJourney } = useAppStore.getState();
    const clock = { t: 0 };
    setT(0);

    const timeline = gsap.timeline({ onComplete: () => startJourney(PART_A_END_T) });
    timeline.to(clock, {
      t: PART_A_END_T,
      duration: PART_A_DURATION_S,
      ease: 'none',
      onUpdate: () => setT(clock.t),
    });

    return () => {
      timeline.kill();
    };
  }, [stage]);

  return null;
}
