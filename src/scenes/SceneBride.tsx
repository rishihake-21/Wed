import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useCueAt } from '../audio/useCueAt';
import type { SceneProps } from '../core/types';
import { LowMist } from '../shared/LowMist';
import { sceneFade } from '../shared/sceneFade';
import { Water } from '../shared/Water';
import { colors } from '../theme/tokens';
import { BrideFigure } from './bride/BrideFigure';
import { TIMING } from './bride/config';
import { LotusPond } from './bride/LotusPond';
import { PaithaniRibbon } from './bride/PaithaniRibbon';
import { Petals } from './bride/Petals';
import { POND_CENTRE, POND_RADIUS } from './bride/stage';

/**
 * Scene 3: the bride's world. A still lotus pond under the same moon, the buds opening as the camera
 * glides in, petals drifting, a Paithani border unfurling around her, and the bride materialising
 * where the camera's gaze lands (core/layout.ts HERO_SPOTS: the mirror of the groom's spot). The room is
 * authored at hero scale (bride/config.ts POND_SCALE), the name and family line are the HTML overlay
 * (ui/overlays/PersonOverlays.tsx). Lite draws nothing here: the sky is the whole scene.
 *
 * `progress` is a ref-style box read inside useFrame, never state. Everything solid dissolves with
 * `fade` (sceneFade of progress) so nothing is in view when the scene unmounts.
 */
export function SceneBride({ progress, quality }: SceneProps) {
  if (quality === 'lite') return null;
  return <BrideWorld progress={progress} quality={quality} />;
}

function BrideWorld({ progress, quality }: SceneProps) {
  // The anklet bells ring as she begins to materialise. Silent on a scrub or menu jump (useCueAt).
  useCueAt(progress, TIMING.anklet, 'anklet');

  /** 1 while the scene plays, easing to 0 at its end. Shared by every material that dissolves. */
  const fade = useMemo(() => ({ value: 1 }), []);
  useFrame(() => {
    fade.value = sceneFade(progress.current);
  });

  return (
    <group>
      <Water progress={progress} quality={quality} position={[POND_CENTRE[0], 0, POND_CENTRE[1]]} radius={POND_RADIUS} ripple={0.45} tint={colors.peacock} tintAmount={0.18} />
      <LotusPond progress={progress} quality={quality} fade={fade} />
      <Petals quality={quality} fade={fade} />
      <PaithaniRibbon progress={progress} quality={quality} fade={fade} />
      <BrideFigure progress={progress} quality={quality} />
      <LowMist progress={progress} quality={quality} />
    </group>
  );
}

export default SceneBride;
