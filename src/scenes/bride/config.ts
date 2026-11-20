import { HERO_HEIGHT } from '../../core/layout';
import { smoothstep } from '../../shared/math';
import type { QualityTier } from '../../core/types';
import { byTier } from '../../shared/tier';
import type { PerTier } from '../../shared/tier';

/** The bride's placeholder cut-out was designed 1.7 m tall; the pond was designed around that. */
export const FIGURE_DESIGN_HEIGHT = 1.7;

/**
 * Everything around her scales with her. The pond's lotuses and pads, the ribbon's width and the
 * petals are authored at the 1.7 m size and multiplied by this, so the room keeps its proportions
 * while the figure stands HERO_HEIGHT tall (core/layout.ts explains why heroes are monumental).
 */
export const POND_SCALE = HERO_HEIGHT / FIGURE_DESIGN_HEIGHT;

/** How far the figure turns from where the camera arrives toward the live camera, 0–1. */
export const FACE_CAMERA = 0.6;

export interface BrideBudget {
  lotuses: number;
  pads: number;
  petals: number;
  /** Ribbon strip resolution: segments along its length and across its width. */
  ribbonAlong: number;
  ribbonAcross: number;
}

/** Lite draws nothing in this scene, so it has no budget. */
export const BUDGETS: PerTier<BrideBudget> = {
  high: { lotuses: 16, pads: 44, petals: 140, ribbonAlong: 240, ribbonAcross: 6 },
  medium: { lotuses: 11, pads: 28, petals: 80, ribbonAlong: 160, ribbonAcross: 4 },
  low: { lotuses: 6, pads: 14, petals: 36, ribbonAlong: 100, ribbonAcross: 2 },
};

/**
 * When each thing happens, as a function of the scene's local progress (0..1). The camera holds its
 * gaze on the bride from 0.2 to 0.68 and sweeps past from about 0.75 (the same rhythm as the groom's
 * scene), so she arrives early, small and far away, and is dissolved before the lens reaches her. Her
 * name is HTML (ui/overlays/PersonOverlays.tsx) on the shared timing (personTiming.ts).
 */
export const TIMING = {
  /** The figure materialises over this range and her anklet bells ring as she starts to. */
  appear: [0.14, 0.36],
  anklet: 0.22,
  /** She dissolves over this range, before the scene's own fade-out (0.86) and before the camera passes. */
  vanish: [0.76, 0.88],
  /** Progress at which the last lotus has finished opening. */
  bloomDone: 0.55,
  /** The ribbon unfurls from its first end to its last over this range. */
  unfurl: [0.08, 0.64],
} as const;

/** Petals and the ribbon's head reveal; reaches 0 again at the end of the scene so nothing pops. */
export const ambient = (p: number): number => smoothstep(0, 0.14, p) * (1 - smoothstep(0.93, 1, p));

/** Counts for a quality tier. Lite never gets here: the scene draws nothing at lite (the sky is the scene). */
export function budgetFor(quality: QualityTier): BrideBudget {
  return byTier(quality, BUDGETS);
}
