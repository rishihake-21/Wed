import type { ComponentType } from 'react';
import type { SceneKey } from '../../core/layout';
import { InvocationOverlay } from './InvocationOverlay';

/**
 * HTML text layers, keyed by scene. A scene with no entry has no text. Each overlay reads its own
 * scene's progress box (core/sceneProgress.ts, which follows `t` outside the Canvas), so overlays
 * keep working however the 3D layer is drawn, including a lite mode with no Canvas at all.
 * Phases 4–8 add their scenes here.
 */
export const OVERLAYS: Partial<Record<SceneKey, ComponentType>> = {
  invocation: InvocationOverlay,
};
