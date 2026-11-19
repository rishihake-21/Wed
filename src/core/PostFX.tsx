import { Bloom, EffectComposer, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { byTier } from '../shared/tier';
import type { PerTier } from '../shared/tier';
import { useAppStore } from './store';

/** Bloom strength and blur depth per tier. Low and lite skip post-processing entirely. */
interface BloomSettings {
  intensity: number;
  levels: number;
}

const BLOOM: PerTier<BloomSettings | null> = {
  high: { intensity: 0.6, levels: 6 },
  medium: { intensity: 0.45, levels: 5 },
  low: null,
};

/**
 * Selective bloom: only pixels brighter than the threshold glow, so flames, the moon and
 * the brightest stars bloom while the dark scenery does not. Shader materials output
 * values above 1.0 for exactly that purpose.
 *
 * Rendering through the composer skips three.js's own tone mapping, so ACES is applied
 * here to keep the look the same with and without post-processing. No multisampling:
 * it is costly on phones (edges are softened by the 1.5× pixel ratio instead).
 */
export function PostFX() {
  const quality = useAppStore((s) => s.quality);
  const bloom = quality === 'lite' ? null : byTier(quality, BLOOM);
  if (!bloom) return null;

  return (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur intensity={bloom.intensity} levels={bloom.levels} luminanceThreshold={1.0} luminanceSmoothing={0.2} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}
