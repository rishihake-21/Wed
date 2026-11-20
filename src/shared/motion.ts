import { useAppStore } from '../core/store';

/**
 * Whether the visitor asked for reduced motion. The store keeps this in step with the OS setting
 * (core/environment.ts), so scenes read it here instead of asking the browser again. Read once per
 * mount: it rarely changes mid-visit.
 */
export const prefersReducedMotion = (): boolean => useAppStore.getState().reducedMotion;

/** Time multiplier for ambient motion (drift, sway, pulses). */
export const motionScale = (): number => (prefersReducedMotion() ? 0.25 : 1);
