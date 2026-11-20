import { HERO_HEIGHT, SCENE_ORIGINS } from '../../core/layout';
import type { QualityTier, SceneProgress } from '../../core/types';
import { CutoutFigure } from '../../shared/CutoutFigure';
import { FACE_CAMERA, TIMING } from './config';
import { BRIDE_ASPECT, drawBrideSilhouette } from './brideSilhouette';
import { ARRIVAL_YAW, BRIDE_SCENE, BRIDE_SPOT } from './stage';

const [ORIGIN_X, , ORIGIN_Z] = SCENE_ORIGINS[BRIDE_SCENE];
const WORLD: readonly [number, number] = [ORIGIN_X + BRIDE_SPOT[0], ORIGIN_Z + BRIDE_SPOT[2]];

/** The bride: a placeholder cut-out HERO_HEIGHT tall that materialises as the ribbon winds around her, then dissolves. */
export function BrideFigure({ progress, quality }: { progress: SceneProgress; quality: QualityTier }) {
  return (
    <CutoutFigure
      quality={quality}
      progress={progress}
      position={BRIDE_SPOT}
      world={WORLD}
      arrivalYaw={ARRIVAL_YAW}
      follow={FACE_CAMERA}
      height={HERO_HEIGHT}
      aspect={BRIDE_ASPECT}
      draw={drawBrideSilhouette}
      appear={TIMING.appear}
      vanish={TIMING.vanish}
    />
  );
}
