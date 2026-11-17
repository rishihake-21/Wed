import type { QualityTier } from './types';

/**
 * Pure quality rules: no browser APIs, no imports beyond types, so they can be reasoned
 * about and tested without a device. The browser probing that feeds them lives in
 * `environment.ts`.
 */

const ORDER: readonly QualityTier[] = ['lite', 'low', 'medium', 'high'];

/** Raw facts about the device, gathered once at startup. `null` means "unknown / not reported". */
export interface QualitySignals {
  webgl2: boolean;
  /** detect-gpu tier 0–3. `null` if detection failed or timed out. */
  gpuTier: number | null;
  /** `navigator.deviceMemory` in GB (Chrome only; rounded to a power of two, max 8). */
  deviceMemoryGb: number | null;
  /** `navigator.connection.saveData` (the browser's data-saver switch). */
  saveData: boolean;
  /** `navigator.connection.effectiveType` is `slow-2g` or `2g`. */
  slowConnection: boolean;
  isMobile: boolean;
}

export interface QualityDecision {
  tier: QualityTier;
  /** Short human-readable reason, shown in the dev overlay. */
  note: string;
}

function capAt(tier: QualityTier, max: QualityTier): QualityTier {
  return ORDER.indexOf(tier) > ORDER.indexOf(max) ? max : tier;
}

/**
 * Picks the starting tier. Order matters: the first rule that applies wins.
 *
 *  - Hard fallbacks to `lite` (2D): no WebGL2, data saver, a 2G link, a GPU benchmarked
 *    below 15 fps (detect-gpu tier 0, which includes its blocklist), or 1 GB of RAM or less.
 *  - Otherwise the GPU tier sets the ceiling: 1 → low, 2 → medium, 3 → high.
 *  - Then memory caps it: 2 GB → low, 4 GB → medium (the "mid-range Android" target).
 *  - If GPU detection failed, assume `low` on phones and `medium` on desktops.
 *
 * The live FPS monitor that steps the tier down while running arrives in Phase 10.
 */
export function decideQuality(s: QualitySignals): QualityDecision {
  if (!s.webgl2) return { tier: 'lite', note: 'no WebGL2' };
  if (s.saveData) return { tier: 'lite', note: 'data saver on' };
  if (s.slowConnection) return { tier: 'lite', note: 'slow connection' };
  if (s.gpuTier === 0) return { tier: 'lite', note: 'weak GPU (tier 0)' };
  if (s.deviceMemoryGb !== null && s.deviceMemoryGb <= 1) {
    return { tier: 'lite', note: `low memory (${s.deviceMemoryGb} GB)` };
  }

  let tier: QualityTier;
  let note: string;
  if (s.gpuTier === null) {
    tier = s.isMobile ? 'low' : 'medium';
    note = 'GPU unknown';
  } else {
    tier = s.gpuTier >= 3 ? 'high' : s.gpuTier === 2 ? 'medium' : 'low';
    note = `GPU tier ${s.gpuTier}`;
  }

  if (s.deviceMemoryGb !== null) {
    const cap: QualityTier | null = s.deviceMemoryGb <= 2 ? 'low' : s.deviceMemoryGb <= 4 ? 'medium' : null;
    if (cap && capAt(tier, cap) !== tier) {
      tier = cap;
      note += `, capped by ${s.deviceMemoryGb} GB RAM`;
    }
  }
  return { tier, note };
}

/**
 * The tier scenes actually use: detection, unless the guest flipped the Lite toggle.
 * Turning Lite off on a device that was auto-sent to lite gives `low`, not `lite`.
 */
export function resolveQuality(detected: QualityTier, liteOverride: boolean | null): QualityTier {
  if (liteOverride === true) return 'lite';
  if (liteOverride === false) return detected === 'lite' ? 'low' : detected;
  return detected;
}
