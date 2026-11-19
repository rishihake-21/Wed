import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  LatheGeometry,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  Vector2,
} from 'three';
import type { QualityTier, SceneProgress } from '../../core/types';
import { GLSL_BILLBOARD, GLSL_NOISE } from '../../shared/glsl';
import { createInstanced, useDisposable } from '../../shared/particles';
import { sceneFade } from '../../shared/sceneFade';
import { SKY } from '../../shared/sky';
import { byTier } from '../../shared/tier';
import { colors } from '../../theme/tokens';
import { DIYA_COUNT, DIYA_SCENE_SECONDS, diyaLayout } from './diyaLayout';

/**
 * Where a diya is, from its start position and the scene's progress. Shared by all three
 * shaders so the bowl, flame and reflection always agree. Diyas drift toward the camera
 * (+z) as the scene plays, and bob and sway a little.
 */
const GLSL_DIYA_POSITION = /* glsl */ `
  uniform float uTime;
  uniform float uDrift;   // metres of drift at speed 1, from scene progress
  attribute vec3 aBase;   // x, (unused), z
  attribute vec3 aMisc;   // phase, speed, scale
  vec3 diyaPos() {
    vec3 p = aBase;
    p.z += uDrift * aMisc.y;
    p.x += sin(uTime * 0.35 + aMisc.x) * 0.25;
    p.y = 0.03 + sin(uTime * 1.3 + aMisc.x * 2.0) * 0.012;
    return p;
  }
`;

const GLSL_DIYA_FADE = /* glsl */ `
  float diyaFade(float dist) {
    return smoothstep(0.8, 2.6, dist) * (1.0 - smoothstep(32.0, 72.0, dist));
  }
`;

/** A shallow clay bowl, thin-walled: outer wall, rim, inner wall. */
function makeBowl(): LatheGeometry {
  const profile = [
    [0.0, 0.0],
    [0.05, 0.004],
    [0.1, 0.02],
    [0.14, 0.045],
    [0.165, 0.075],
    [0.172, 0.083],
    [0.155, 0.086],
    [0.135, 0.07],
    [0.09, 0.042],
    [0.04, 0.027],
    [0.0, 0.024],
  ].map(([x, y]) => new Vector2(x, y));
  return new LatheGeometry(profile, 12);
}

const warm = new Color(colors.marigold);
const gold = new Color(colors.gold);
const cream = new Color(colors.cream);

function flameUniforms() {
  return {
    uTime: { value: 0 },
    uDrift: { value: 0 },
    uFade: { value: 1 },
    uOuter: { value: warm.clone().lerp(gold, 0.4) },
    uCore: { value: cream.clone() },
    uHalo: { value: warm.clone() },
  };
}

function bowlMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    fog: true,
    side: DoubleSide,
    uniforms: UniformsUtils.merge([
      UniformsLib.fog,
      {
        uTime: { value: 0 },
        uDrift: { value: 0 },
        uFade: { value: 1 },
        uClay: { value: warm.clone().multiplyScalar(0.32) },
        uGlow: { value: warm.clone() },
        uFadeColor: { value: SKY.horizon },
      },
    ]),
    vertexShader: /* glsl */ `
      #include <fog_pars_vertex>
      ${GLSL_DIYA_POSITION}
      varying float vShade;
      varying float vHeight;
      void main() {
        vec3 wp = diyaPos() + position * aMisc.z;
        vec4 mvPosition = modelViewMatrix * vec4(wp, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        vShade = 0.35 + 0.65 * clamp(dot(normalize(normalMatrix * normal), vec3(0.25, 0.9, 0.35)), 0.0, 1.0);
        vHeight = position.y;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uClay, uGlow, uFadeColor;
      uniform float uFade;
      varying float vShade;
      varying float vHeight;
      #include <fog_pars_fragment>
      void main() {
        // Dark clay, warmed by the flame near the rim and inside the bowl.
        float lit = smoothstep(0.03, 0.085, vHeight);
        vec3 col = uClay * vShade + uGlow * lit * 0.55;
        col = mix(uFadeColor, col, uFade); // dissolves into the water's own end colour as the scene ends
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
  });
}

function flameMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    fog: false,
    uniforms: flameUniforms(),
    vertexShader: /* glsl */ `
      ${GLSL_BILLBOARD}
      ${GLSL_DIYA_POSITION}
      ${GLSL_DIYA_FADE}
      varying vec2 vUv;
      varying float vFade;
      varying float vSeed;
      void main() {
        float s = aMisc.z;
        float dist;
        gl_Position = billboardClip(diyaPos() + vec3(0.0, 0.30 * s, 0.0), position.xy, vec2(0.9, 1.1) * s, dist);
        vUv = uv;
        vSeed = aMisc.x;
        vFade = diyaFade(dist);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime, uFade;
      uniform vec3 uOuter, uCore, uHalo;
      varying vec2 vUv;
      varying float vFade;
      varying float vSeed;
      void main() {
        // Soft halo around the flame.
        vec2 h = (vUv - vec2(0.5, 0.42)) * vec2(1.0, 1.25);
        float halo = exp(-dot(h, h) * 20.0) * 0.5;
        halo *= smoothstep(0.22, 0.42, vUv.y); // the water hides the lower half: fade out to the waterline, not cut

        // Teardrop flame, wobbling with two out-of-step sines.
        float y = (vUv.y - 0.30) / 0.31;
        float x = (vUv.x - 0.5) / 0.072;
        x += (sin(uTime * 11.0 + vSeed * 30.0) * 0.08 + sin(uTime * 17.0 + vSeed * 11.0) * 0.05) * y * 2.0;
        float w = max(sin(clamp(y, 0.0, 1.0) * 2.6) * (1.0 - y * 0.25), 0.02);
        float inside = (y > 0.0 && y < 1.0) ? 1.0 : 0.0;
        float body = inside * smoothstep(1.0, 0.35, abs(x) / w);
        float core = body * smoothstep(0.75, 0.0, abs(x) / w) * (1.0 - y * 0.6);

        vec3 col = uHalo * halo + uOuter * body * 1.7 + uCore * core * 2.0;
        gl_FragColor = vec4(col * vFade * uFade, 1.0);
      }
    `,
  });
}

/** The light each flame throws on the water: a streak running from the diya toward the viewer. */
function reflectionMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
    fog: false,
    uniforms: flameUniforms(),
    vertexShader: /* glsl */ `
      ${GLSL_DIYA_POSITION}
      ${GLSL_DIYA_FADE}
      varying vec2 vUv;
      varying float vFade;
      void main() {
        float s = aMisc.z;
        vec3 c = diyaPos();
        vec3 wp = vec3(c.x + position.x * 0.9 * s, 0.025, c.z + (position.y + 0.5) * 4.0 * s);
        vec4 mv = modelViewMatrix * vec4(wp, 1.0);
        gl_Position = projectionMatrix * mv;
        vUv = uv;
        vFade = diyaFade(-mv.z);
      }
    `,
    fragmentShader: /* glsl */ `
      ${GLSL_NOISE}
      uniform float uTime, uFade;
      uniform vec3 uOuter;
      varying vec2 vUv;
      varying float vFade;
      void main() {
        float across = abs(vUv.x - 0.5) * 2.0;
        float shape = (1.0 - across * across) * exp(-vUv.y * 3.2);
        float shimmer = 0.65 + 0.35 * noise21(vec2(vUv.x * 7.0, vUv.y * 11.0 - uTime * 1.6));
        gl_FragColor = vec4(uOuter * shape * shimmer * 0.9 * vFade * uFade, 1.0);
      }
    `,
  });
}

interface FloatingDiyasProps {
  progress: SceneProgress;
  quality: QualityTier;
}

/**
 * Diyas floating on the Yamuna: clay bowls, flames with a halo, and their light on the water.
 * Three instanced meshes (three draw calls) however many diyas; positions are computed on
 * the GPU from the scene's progress, so scrubbing the scroll replays the drift exactly.
 */
export function FloatingDiyas({ progress, quality }: FloatingDiyasProps) {
  const count = byTier(quality, DIYA_COUNT);

  const { bowlGeometry, quadGeometry } = useMemo(() => {
    const { base, misc } = diyaLayout(count);
    const attributes = { aBase: { itemSize: 3, array: base }, aMisc: { itemSize: 3, array: misc } };
    return {
      bowlGeometry: createInstanced(count, attributes, makeBowl()),
      quadGeometry: createInstanced(count, attributes),
    };
  }, [count]);
  const materials = useMemo(() => ({ bowl: bowlMaterial(), flame: flameMaterial(), reflection: reflectionMaterial() }), []);

  useDisposable(bowlGeometry);
  useDisposable(quadGeometry);
  useDisposable(materials.bowl);
  useDisposable(materials.flame);
  useDisposable(materials.reflection);

  useFrame(({ clock }) => {
    const drift = progress.current * DIYA_SCENE_SECONDS;
    const fade = sceneFade(progress.current);
    for (const material of [materials.bowl, materials.flame, materials.reflection]) {
      material.uniforms.uTime.value = clock.elapsedTime;
      material.uniforms.uDrift.value = drift;
      material.uniforms.uFade.value = fade;
    }
  });

  return (
    <>
      <mesh geometry={bowlGeometry} material={materials.bowl} frustumCulled={false} />
      <mesh geometry={quadGeometry} material={materials.reflection} frustumCulled={false} renderOrder={1} />
      <mesh geometry={quadGeometry} material={materials.flame} frustumCulled={false} renderOrder={3} />
    </>
  );
}
