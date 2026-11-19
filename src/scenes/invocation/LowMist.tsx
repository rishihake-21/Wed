import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, ShaderMaterial } from 'three';
import type { QualityTier, SceneProgress } from '../../core/types';
import { GLSL_BILLBOARD, GLSL_NOISE } from '../../shared/glsl';
import { createInstanced, seededRandom, useDisposable } from '../../shared/particles';
import { sceneFade } from '../../shared/sceneFade';
import { SKY } from '../../shared/sky';
import { byTier } from '../../shared/tier';
import { colors } from '../../theme/tokens';

const PUFF_COUNT = { high: 16, medium: 10, low: 5 } as const;

function makeMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTime: { value: 0 },
      uFade: { value: 1 },
      uColor: { value: SKY.band.clone().lerp(new Color(colors.cream), 0.04) },
    },
    vertexShader: /* glsl */ `
      ${GLSL_BILLBOARD}
      attribute vec3 aCenter;  // x, y, z
      attribute vec3 aMisc;    // phase, width, height
      uniform float uTime;
      varying vec2 vUv;
      varying float vFade;
      varying float vPhase;
      void main() {
        vec3 c = aCenter;
        c.x += sin(uTime * 0.06 + aMisc.x) * 2.5;
        float dist;
        gl_Position = billboardClip(c, position.xy, aMisc.yz, dist);
        vUv = uv;
        vPhase = aMisc.x;
        // Fade out as the camera passes through, and with distance.
        vFade = smoothstep(3.0, 10.0, dist) * (1.0 - smoothstep(45.0, 90.0, dist));
      }
    `,
    fragmentShader: /* glsl */ `
      ${GLSL_NOISE}
      uniform float uTime, uFade;
      uniform vec3 uColor;
      varying vec2 vUv;
      varying float vFade;
      varying float vPhase;
      void main() {
        vec2 q = (vUv - 0.5) * 2.0;
        float shape = pow(clamp(1.0 - dot(q, q), 0.0, 1.0), 1.5);
        float wisps = 0.55 + 0.45 * noise21(vUv * vec2(4.0, 2.0) + vec2(uTime * 0.03 + vPhase, vPhase * 3.0));
        gl_FragColor = vec4(uColor, shape * wisps * vFade * uFade * 0.2);
      }
    `,
  });
}

/** Low mist over the water: big, soft, slowly drifting puffs. Alpha-blended, so kept few. */
export function LowMist({ progress, quality }: { progress: SceneProgress; quality: QualityTier }) {
  const count = byTier(quality, PUFF_COUNT);
  const geometry = useMemo(() => {
    const rand = seededRandom(108);
    const center = new Float32Array(count * 3);
    const misc = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      center.set([-6 + (rand() - 0.5) * 50, 0.25 + rand() * 0.7, -48 + rand() * 70], i * 3);
      misc.set([rand() * 6.283, 9 + rand() * 9, 1.6 + rand() * 1.6], i * 3);
    }
    return createInstanced(count, { aCenter: { itemSize: 3, array: center }, aMisc: { itemSize: 3, array: misc } });
  }, [count]);
  const material = useMemo(makeMaterial, []);
  useDisposable(geometry);
  useDisposable(material);

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uFade.value = sceneFade(progress.current);
  });

  return <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={2} />;
}
