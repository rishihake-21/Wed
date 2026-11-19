import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, PerspectiveCamera, ShaderMaterial } from 'three';
import type { QualityTier, SceneProgress, Vec3 } from '../core/types';
import { colors } from '../theme/tokens';
import { seededRandom, useDisposable } from './particles';
import { sceneFade } from './sceneFade';
import { byTier } from './tier';
import type { PerTier } from './tier';

const DEFAULT_COUNT: PerTier<number> = { high: 160, medium: 90, low: 40 };

interface FirefliesProps {
  quality: QualityTier;
  /** Box (scene-local) the fireflies wander in: [min, max] corners. */
  box: readonly [Vec3, Vec3];
  /** Counts per tier; the default suits a full-screen scene. */
  count?: PerTier<number>;
  seed?: number;
  /** The owning scene's progress: the fireflies fade out over its last stretch (see sceneFade). Omit for no fade. */
  progress?: SceneProgress;
}

function makeGeometry(count: number, [min, max]: readonly [Vec3, Vec3], seed: number): BufferGeometry {
  const rand = seededRandom(seed);
  const position = new Float32Array(count * 3);
  const phase = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    position.set(
      [min[0] + rand() * (max[0] - min[0]), min[1] + rand() * (max[1] - min[1]), min[2] + rand() * (max[2] - min[2])],
      i * 3,
    );
    phase.set([rand() * 6.283, rand() * 6.283, rand()], i * 3);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(position, 3));
  geometry.setAttribute('aPhase', new BufferAttribute(phase, 3));
  return geometry;
}

function makeMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    fog: false,
    uniforms: {
      uTime: { value: 0 },
      uFade: { value: 1 },
      uScale: { value: 700 }, // pixels per world unit at distance 1
      uColor: { value: new Color(colors.gold).lerp(new Color(colors.peacock), 0.22) },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aPhase;
      uniform float uTime;
      uniform float uScale;
      varying float vBlink;
      void main() {
        vec3 p = position;
        // Lazy figure-of-eights, each firefly on its own phase and pace.
        float k = 0.4 + aPhase.z * 0.5;
        p.x += sin(uTime * k + aPhase.x) * 0.9;
        p.y += sin(uTime * k * 1.3 + aPhase.y) * 0.35;
        p.z += cos(uTime * k * 0.8 + aPhase.x) * 0.9;

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float dist = -mv.z;
        gl_Position = projectionMatrix * mv;

        float blink = pow(max(sin(uTime * (0.9 + aPhase.z * 1.4) + aPhase.y * 3.0), 0.0), 3.0);
        float fade = smoothstep(1.0, 3.0, dist) * (1.0 - smoothstep(30.0, 60.0, dist));
        vBlink = (0.12 + 0.88 * blink) * fade;
        gl_PointSize = max(2.0, 0.075 * uScale / max(dist, 0.5));
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uFade;
      varying float vBlink;
      void main() {
        float r = length(gl_PointCoord - 0.5) * 2.0;
        float a = pow(1.0 - clamp(r, 0.0, 1.0), 2.2);
        gl_FragColor = vec4(uColor * a * vBlink * 2.4 * uFade, 1.0);
      }
    `,
  });
}

/** Fireflies drifting and blinking inside a box. One draw call; scaled by quality tier. */
export function Fireflies({ quality, box, count = DEFAULT_COUNT, seed = 7, progress }: FirefliesProps) {
  const n = byTier(quality, count);
  const geometry = useMemo(() => makeGeometry(n, box, seed), [n, box, seed]);
  const material = useMemo(makeMaterial, []);
  useDisposable(geometry);
  useDisposable(material);

  useFrame(({ clock, gl, camera, size }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uFade.value = progress ? sceneFade(progress.current) : 1;
    const fov = (camera as PerspectiveCamera).fov ?? 60;
    material.uniforms.uScale.value = (size.height * gl.getPixelRatio()) / (2 * Math.tan((fov * Math.PI) / 360));
  });

  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={4} />;
}
