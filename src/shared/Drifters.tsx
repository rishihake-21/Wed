import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide, ShaderMaterial } from 'three';
import type { IUniform } from 'three';
import type { QualityTier, Vec3 } from '../core/types';
import { createInstanced, seededRandom, useDisposable } from './particles';
import { byTier } from './tier';
import type { PerTier } from './tier';

interface DriftersProps {
  quality: QualityTier;
  count: PerTier<number>;
  /** Box (scene-local) the particles drift through. They wrap from one side to the other, fading at the edges. */
  box: readonly [Vec3, Vec3];
  /** Particle size range in metres. */
  size: readonly [number, number];
  /**
   * GLSL for the particle's look. Must define
   *   vec4 drifterShade(vec2 uv, float seed, float facing)
   * returning rgb and alpha (alpha 0 outside the shape). `uv` runs 0–1 across the quad, `seed` is
   * 0–1 and fixed per particle, `facing` is |dot(normal, view)| (0 edge-on, 1 face-on).
   * Declare any extra uniforms in the snippet and pass their values in `uniforms`.
   */
  shade: string;
  uniforms?: Record<string, IUniform>;
  /** Fall speed in m/s (negative rises). */
  fall?: number;
  /** Wind in m/s on x and z. */
  wind?: readonly [number, number];
  seed?: number;
  /**
   * One shared box the scene writes sceneFade(progress) into every frame. The particles dissolve with
   * it, so none is still in view when the scene unmounts (CLAUDE.md).
   */
  fade: { value: number };
}

function makeMaterial(shade: string, extra: Record<string, IUniform>, box: readonly [Vec3, Vec3], fade: { value: number }): ShaderMaterial {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    fog: false,
    uniforms: {
      uTime: { value: 0 },
      uFall: { value: 0.3 },
      uWind: { value: [0, 0] },
      uBoxMin: { value: box[0] },
      uBoxMax: { value: box[1] },
      uFade: fade,
      ...extra,
    },
    vertexShader: /* glsl */ `
      attribute vec3 aBase;   // start position, inside the box
      attribute vec4 aMisc;   // seed, size, fall-speed factor, spin speed
      uniform float uTime;
      uniform float uFall;
      uniform vec2 uWind;
      uniform vec3 uBoxMin;
      uniform vec3 uBoxMax;
      varying vec2 vUv;
      varying float vSeed;
      varying float vFade;
      varying float vFacing;

      vec3 rotateAround(vec3 v, vec3 axis, float a) {
        float c = cos(a), s = sin(a);
        return v * c + cross(axis, v) * s + axis * dot(axis, v) * (1.0 - c);
      }

      void main() {
        vec3 span = uBoxMax - uBoxMin;
        vec3 p = aBase - uBoxMin;
        p.y -= uTime * uFall * aMisc.z;
        p.x += uTime * uWind.x + sin(uTime * 0.6 + aMisc.x * 40.0) * 0.5;
        p.z += uTime * uWind.y + cos(uTime * 0.5 + aMisc.x * 23.0) * 0.5;
        p = mod(p, span);
        vec3 world = p + uBoxMin;

        // Tumble about a random axis, so each particle flashes face-on and edge-on in turn.
        vec3 axis = normalize(vec3(sin(aMisc.x * 91.7), 1.0, cos(aMisc.x * 57.3)));
        float angle = uTime * aMisc.w + aMisc.x * 6.2831;
        vec3 corner = rotateAround(vec3(position.xy * aMisc.y, 0.0), axis, angle);
        vec3 normalWorld = rotateAround(vec3(0.0, 0.0, 1.0), axis, angle);

        vec4 mv = modelViewMatrix * vec4(world + corner, 1.0);
        gl_Position = projectionMatrix * mv;

        vec3 h = p / span;
        float edge = min(min(h.x, 1.0 - h.x), min(h.y, 1.0 - h.y));
        edge = min(edge, min(h.z, 1.0 - h.z));
        float dist = -mv.z;
        // Gone by the fog's far plane (SEGMENT_LENGTH = 30), so the next room's drifters never pop in as it mounts.
        vFade = smoothstep(0.0, 0.1, edge) * smoothstep(1.5, 4.0, dist) * (1.0 - smoothstep(14.0, 30.0, dist));
        vFacing = abs(dot(normalize(normalMatrix * normalWorld), normalize(-mv.xyz)));
        vUv = uv;
        vSeed = aMisc.x;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uFade;
      varying vec2 vUv;
      varying float vSeed;
      varying float vFade;
      varying float vFacing;
      ${shade}
      void main() {
        vec4 c = drifterShade(vUv, vSeed, vFacing);
        gl_FragColor = vec4(c.rgb, c.a * vFade * uFade);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

/**
 * Drifting particles (petals, feathers, ash...): flat quads that tumble as they fall through a
 * box. One draw call; all motion is in the vertex shader. What each particle looks like is
 * the `shade` snippet, so scenes share the motion and differ only in the look.
 */
export function Drifters({ quality, count, box, size, shade, uniforms = {}, fall = 0.3, wind = [0.2, -0.08], seed = 3, fade }: DriftersProps) {
  const n = byTier(quality, count);

  const geometry = useMemo(() => {
    const rand = seededRandom(seed);
    const base = new Float32Array(n * 3);
    const misc = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      base.set(
        [
          box[0][0] + rand() * (box[1][0] - box[0][0]),
          box[0][1] + rand() * (box[1][1] - box[0][1]),
          box[0][2] + rand() * (box[1][2] - box[0][2]),
        ],
        i * 3,
      );
      misc.set([rand(), size[0] + rand() * (size[1] - size[0]), 0.6 + rand() * 0.8, 0.6 + rand() * 1.8], i * 4);
    }
    return createInstanced(n, { aBase: { itemSize: 3, array: base }, aMisc: { itemSize: 4, array: misc } });
  }, [n, box, size, seed]);

  // The shade snippet and its uniforms are fixed for a Drifters instance; pass stable values.
  const material = useMemo(() => makeMaterial(shade, uniforms, box, fade), [shade, uniforms, box, fade]);
  useDisposable(geometry);
  useDisposable(material);

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uFall.value = fall;
    material.uniforms.uWind.value = wind;
  });

  return <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={5} />;
}
