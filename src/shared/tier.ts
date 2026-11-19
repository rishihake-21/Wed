import type { QualityTier } from '../core/types';

export interface PerTier<T> {
  high: T;
  medium: T;
  low: T;
}

/** Picks a value by quality tier. `lite` takes the `low` value; scenes handle lite themselves (no 3D at all). */
export function byTier<T>(quality: QualityTier, values: PerTier<T>): T {
  return quality === 'high' ? values.high : quality === 'medium' ? values.medium : values.low;
}
