import type { ComponentType } from 'react';
import { SCENE_COUNT } from '../core/layout';
import type { SceneProps } from '../core/types';
import { SceneBride } from './SceneBride';
import { SceneDate } from './SceneDate';
import { SceneFamilies } from './SceneFamilies';
import { SceneGroom } from './SceneGroom';
import { SceneInvocation } from './SceneInvocation';
import { SceneRsvp } from './SceneRsvp';
import { SceneSchedule } from './SceneSchedule';
import { SceneUnion } from './SceneUnion';
import { SceneVenue } from './SceneVenue';

/**
 * Scene registry, in journey order (index 0 = Scene 1). Must match SCENE_META in core/layout.ts.
 * Phase 10 swaps these static imports for lazy ones.
 */
export const SCENES: readonly ComponentType<SceneProps>[] = [
  SceneInvocation,
  SceneGroom,
  SceneBride,
  SceneUnion,
  SceneDate,
  SceneVenue,
  SceneSchedule,
  SceneFamilies,
  SceneRsvp,
];

if (SCENES.length !== SCENE_COUNT) {
  throw new Error(`SCENES has ${SCENES.length} entries but SCENE_COUNT is ${SCENE_COUNT}`);
}
