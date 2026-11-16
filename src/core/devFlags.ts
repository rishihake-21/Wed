import type { QualityTier } from './types';

/**
 * URL-driven developer switches, read once at startup.
 *
 *   ?stage=journey   skip the gate and start in scroll mode over all nine scenes
 *   ?quality=low     force a quality tier (high | medium | low | lite)
 *   ?debug           show FPS counter and debug overlay (always on in `npm run dev`)
 */

const params = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);

const TIERS: readonly QualityTier[] = ['high', 'medium', 'low', 'lite'];
const requestedQuality = params.get('quality');

export const DEV_FLAGS = {
  startInJourney: params.get('stage') === 'journey',
  showDebug: import.meta.env.DEV || params.has('debug'),
  forcedQuality: TIERS.find((tier) => tier === requestedQuality) ?? null,
};
