import type { SceneProps, Vec3 } from '../core/types';
import { Fireflies } from '../shared/Fireflies';
import { LowMist } from '../shared/LowMist';
import { Water } from '../shared/Water';
import { FloatingDiyas } from './invocation/FloatingDiyas';

/** Where the fireflies wander: over the water and the near bank, around the camera's path. */
const FIREFLY_BOX: readonly [Vec3, Vec3] = [
  [-18, 0.4, -50],
  [8, 2.4, 20],
];

/**
 * Scene 1 — Invocation: the Yamuna at night, seen from just above the water. The sky is the
 * persistent NightSky backdrop; this scene adds the water, floating diyas, fireflies and low
 * mist. The camera glide comes from the rig, the invocation text from the HTML overlay
 * (src/ui/overlays/InvocationOverlay.tsx). Lite quality draws nothing here: the static sky
 * gradient behind it is the whole scene.
 */
export function SceneInvocation({ progress, quality }: SceneProps) {
  if (quality === 'lite') return null;

  return (
    <group>
      <Water progress={progress} quality={quality} />
      <FloatingDiyas progress={progress} quality={quality} />
      <Fireflies quality={quality} box={FIREFLY_BOX} progress={progress} />
      <LowMist progress={progress} quality={quality} />
    </group>
  );
}
