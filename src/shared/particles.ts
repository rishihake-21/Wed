import { useEffect } from 'react';
import { InstancedBufferAttribute, InstancedBufferGeometry, PlaneGeometry } from 'three';
import type { BufferGeometry } from 'three';

export interface InstanceAttribute {
  itemSize: number;
  array: Float32Array;
}

/**
 * Repeats `base` (default: a unit quad, -0.5..0.5) `count` times, with per-instance
 * attributes read by a custom vertex shader. One draw call however many instances.
 *
 * Meshes using it should set `frustumCulled={false}`: instance positions are computed in
 * the shader, so three.js's bounding sphere says nothing about where they end up.
 */
export function createInstanced(
  count: number,
  attributes: Record<string, InstanceAttribute>,
  base: BufferGeometry = new PlaneGeometry(1, 1),
): InstancedBufferGeometry {
  const geometry = new InstancedBufferGeometry();
  geometry.index = base.index;
  for (const name of Object.keys(base.attributes)) geometry.setAttribute(name, base.getAttribute(name));
  for (const [name, { array, itemSize }] of Object.entries(attributes)) {
    geometry.setAttribute(name, new InstancedBufferAttribute(array, itemSize));
  }
  geometry.instanceCount = count;
  return geometry;
}

/** Small deterministic random generator (mulberry32): same seed, same layout every run. */
export { mulberry32 as seededRandom } from './rng';

/**
 * Frees a hand-built geometry, material or texture when the component unmounts.
 * R3F only disposes what it created itself from JSX.
 */
export function useDisposable(resource: { dispose: () => void }): void {
  useEffect(() => () => resource.dispose(), [resource]);
}
