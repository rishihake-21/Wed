import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, ShaderMaterial, UniformsLib, UniformsUtils } from 'three';
import { GLSL_NOISE } from './glsl';
import { useDisposable } from './particles';
import { sceneFade } from './sceneFade';
import { MOON_DIRECTION, SKY } from './sky';
import { byTier } from './tier';
import type { QualityTier, SceneProgress, Vec3 } from '../core/types';
import { colors } from '../theme/tokens';

/** Ripple layers per tier (each is one cos() in the fragment shader). */
const RIPPLE_LAYERS = { high: 3, medium: 2, low: 1 } as const;

/** Endless water: bigger than the fog's far distance, so its edge is always fully fogged. */
const ENDLESS_SIZE = 190;

interface WaterOptions {
  layers: number;
  /** A pond with a rim that fades into the horizon colour, instead of a river out to the horizon. */
  bounded: boolean;
  ripple: number;
  tint: Color | null;
  tintAmount: number;
}

function makeMaterial({ layers, bounded, ripple, tint, tintAmount }: WaterOptions): ShaderMaterial {
  const deep = new Color(colors.midnight).lerp(new Color(colors.yamuna), 0.16).multiplyScalar(0.7);
  if (tint) deep.lerp(tint, tintAmount);
  return new ShaderMaterial({
    fog: true,
    defines: bounded ? { LAYERS: layers, BOUNDED: 1 } : { LAYERS: layers },
    uniforms: UniformsUtils.merge([
      UniformsLib.fog,
      {
        uTime: { value: 0 },
        uFade: { value: 1 },
        uRipple: { value: ripple },
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
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      ${GLSL_NOISE}
      uniform float uTime, uFade, uRipple;
      uniform vec3 uDeep, uHorizon, uBand, uZenith, uMoonColor, uMoonDir;
      varying vec3 vWorld;
      varying vec2 vUv;
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
        g *= uRipple;
        vec3 N = normalize(vec3(-g.x, 1.0, -g.y));

        float cosT = clamp(dot(N, V), 0.0, 1.0);
        float fresnel = 0.03 + 0.97 * pow(1.0 - cosT, 5.0);

        vec3 R = reflect(-V, N);
        vec3 col = mix(uDeep, skyColor(R), fresnel);

        // Faked moon reflection: a sharp glint plus a soft glow, broken up by the ripples.
        float m = max(dot(R, uMoonDir), 0.0);
        float glint = pow(m, 220.0) * 2.0 + pow(m, 45.0) * 0.14 + pow(m, 14.0) * 0.02;
        col += uMoonColor * glint;

        #ifdef BOUNDED
          // A pond, not a river: the water fades into the horizon colour at its rim.
          col = mix(col, uHorizon, smoothstep(0.62, 1.0, length(vUv - 0.5) * 2.0));
        #endif

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

interface WaterProps {
  progress: SceneProgress;
  quality: QualityTier;
  /** Scene-local centre of the water plane. */
  position?: Vec3;
  /** Pond radius in metres. Omit for endless water (a river, out to the horizon). */
  radius?: number;
  /** Ripple strength: 1 is the river, lower is a calmer pond. */
  ripple?: number;
  /** Mixes the deep water colour toward this colour (e.g. a green pond). */
  tint?: string;
  tintAmount?: number;
}

/**
 * One plane, all the work in the fragment shader (ripples, fresnel, moon glint). The Yamuna in
 * scene 1 (endless, the default) and the lotus pond in scene 3 (`radius`, a rim that fades out).
 * It dissolves into the horizon colour over the end of the scene's progress.
 */
export function Water({ progress, quality, position = [0, 0, -40], radius, ripple = 1, tint, tintAmount = 0.2 }: WaterProps) {
  const layers = byTier(quality, RIPPLE_LAYERS);
  const bounded = radius !== undefined;
  const material = useMemo(
    () => makeMaterial({ layers, bounded, ripple, tint: tint ? new Color(tint) : null, tintAmount }),
    [layers, bounded, ripple, tint, tintAmount],
  );
  useDisposable(material);

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uFade.value = sceneFade(progress.current);
  });

  const half = radius ?? ENDLESS_SIZE / 2;
  return (
    <mesh material={material} rotation={[-Math.PI / 2, 0, 0]} position={position} frustumCulled={false}>
      <planeGeometry args={[half * 2, half * 2]} />
    </mesh>
  );
}
