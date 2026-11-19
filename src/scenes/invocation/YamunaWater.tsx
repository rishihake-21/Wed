import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, ShaderMaterial, UniformsLib, UniformsUtils } from 'three';
import { GLSL_NOISE } from '../../shared/glsl';
import { useDisposable } from '../../shared/particles';
import { sceneFade } from '../../shared/sceneFade';
import { MOON_DIRECTION, SKY } from '../../shared/sky';
import { byTier } from '../../shared/tier';
import type { QualityTier, SceneProgress } from '../../core/types';
import { colors } from '../../theme/tokens';

/** Ripple layers per tier (each is one cos() in the fragment shader). */
const RIPPLE_LAYERS = { high: 3, medium: 2, low: 1 } as const;

/** Plane size. Bigger than the fog's far distance, so its edge is always fully fogged. */
const SIZE = 190;

function makeMaterial(layers: number): ShaderMaterial {
  const deep = new Color(colors.midnight).lerp(new Color(colors.yamuna), 0.16).multiplyScalar(0.7);
  return new ShaderMaterial({
    fog: true,
    defines: { LAYERS: layers },
    uniforms: UniformsUtils.merge([
      UniformsLib.fog,
      {
        uTime: { value: 0 },
        uFade: { value: 1 },
        uDeep: { value: deep },
        uHorizon: { value: SKY.horizon },
        uBand: { value: SKY.band },
        uZenith: { value: SKY.zenith },
        uMoonColor: { value: SKY.moon },
        uMoonDir: { value: MOON_DIRECTION },
      },
    ]),
    vertexShader: /* glsl */ `
      #include <fog_pars_vertex>
      varying vec3 vWorld;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      ${GLSL_NOISE}
      uniform float uTime, uFade;
      uniform vec3 uDeep, uHorizon, uBand, uZenith, uMoonColor, uMoonDir;
      varying vec3 vWorld;
      #include <fog_pars_fragment>

      // Gradient of one travelling sine ripple.
      vec2 ripple(vec2 p, vec2 dir, float freq, float speed, float amp) {
        return normalize(dir) * freq * amp * cos(dot(p, normalize(dir)) * freq + uTime * speed);
      }

      vec3 skyColor(vec3 r) {
        float y = max(r.y, 0.0);
        vec3 c = mix(uHorizon, uZenith, smoothstep(0.0, 0.85, y));
        float band = smoothstep(0.0, 0.1, y) * (1.0 - smoothstep(0.1, 0.45, y));
        return mix(c, uBand, band * 0.8);
      }

      void main() {
        vec3 V = normalize(cameraPosition - vWorld);
        vec2 p = vWorld.xz;

        vec2 g = ripple(p, vec2(0.9, 0.45), 1.4, 0.9, 0.012);
        #if LAYERS >= 2
          g += ripple(p, vec2(-0.5, 0.85), 3.1, 1.35, 0.007);
        #endif
        #if LAYERS >= 3
          g += ripple(p, vec2(0.3, -0.95), 6.3, 2.0, 0.003);
          g += (vec2(noise21(p * 2.5 + uTime * 0.2), noise21(p * 2.5 - uTime * 0.17 + 9.0)) - 0.5) * 0.01;
        #endif
        vec3 N = normalize(vec3(-g.x, 1.0, -g.y));

        float cosT = clamp(dot(N, V), 0.0, 1.0);
        float fresnel = 0.03 + 0.97 * pow(1.0 - cosT, 5.0);

        vec3 R = reflect(-V, N);
        vec3 col = mix(uDeep, skyColor(R), fresnel);

        // Faked moon reflection: a sharp glint plus a soft glow, broken up by the ripples.
        float m = max(dot(R, uMoonDir), 0.0);
        float glint = pow(m, 220.0) * 2.0 + pow(m, 45.0) * 0.14 + pow(m, 14.0) * 0.02;
        col += uMoonColor * glint;

        // The scene unmounts at the end of its progress: dissolve into the colour of the empty ground below the horizon.
        col = mix(uHorizon, col, uFade);

        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
  });
}

/** The Yamuna: one big plane, all the work in the fragment shader (ripples, fresnel, moon glint). */
export function YamunaWater({ progress, quality }: { progress: SceneProgress; quality: QualityTier }) {
  const layers = byTier(quality, RIPPLE_LAYERS);
  const material = useMemo(() => makeMaterial(layers), [layers]);
  useDisposable(material);

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uFade.value = sceneFade(progress.current);
  });

  return (
    <mesh material={material} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -40]} frustumCulled={false}>
      <planeGeometry args={[SIZE, SIZE]} />
    </mesh>
  );
}
