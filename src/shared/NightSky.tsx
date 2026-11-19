import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, BackSide, BufferAttribute, BufferGeometry, Color, ShaderMaterial } from 'three';
import { colors } from '../theme/tokens';
import type { QualityTier } from '../core/types';
import { GLSL_NOISE } from './glsl';
import { seededRandom, useDisposable } from './particles';
import { MOON_DIRECTION, MOON_SIZE, SKY } from './sky';
import { byTier } from './tier';

const STAR_COUNT = { high: 1100, medium: 650, low: 300 } as const;

/** Both shaders draw at infinity: they use only the camera's rotation, never its position. */
const AT_INFINITY = /* glsl */ `
  vec4 skyClip(vec3 dir) {
    return projectionMatrix * vec4(mat3(viewMatrix) * dir, 1.0);
  }
`;

const domeMaterial = () =>
  new ShaderMaterial({
    side: BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uHorizon: { value: SKY.horizon },
      uBand: { value: SKY.band },
      uZenith: { value: SKY.zenith },
      uMoonColor: { value: SKY.moon },
      uMoonDir: { value: MOON_DIRECTION },
      uMoonSize: { value: MOON_SIZE },
    },
    vertexShader: /* glsl */ `
      ${AT_INFINITY}
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = skyClip(position).xyww;  // depth = far plane: always behind everything
      }
    `,
    fragmentShader: /* glsl */ `
      ${GLSL_NOISE}
      uniform vec3 uHorizon, uBand, uZenith, uMoonColor, uMoonDir;
      uniform float uMoonSize;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float y = d.y;

        vec3 col = mix(uHorizon, uZenith, smoothstep(0.0, 0.85, y));
        float band = smoothstep(0.0, 0.1, y) * (1.0 - smoothstep(0.1, 0.45, y));
        col = mix(col, uBand, band * 0.8);

        // Moon: disc, faint maria, soft halo.
        float ang = acos(clamp(dot(d, uMoonDir), -1.0, 1.0));
        vec3 t1 = normalize(cross(uMoonDir, vec3(0.0, 1.0, 0.0)));
        vec3 t2 = cross(t1, uMoonDir);
        vec2 mp = vec2(dot(d, t1), dot(d, t2)) / uMoonSize;
        float maria = noise21(mp * 2.6 + 7.0) * 0.6 + noise21(mp * 6.0) * 0.4;
        float disc = 1.0 - smoothstep(uMoonSize * 0.97, uMoonSize, ang);
        float halo = exp(-ang * ang / (uMoonSize * uMoonSize * 30.0)) * 0.2 + exp(-ang / (uMoonSize * 5.0)) * 0.035;
        col += uMoonColor * halo * smoothstep(-0.03, 0.01, y); // a sky ends at the horizon: no glow spilling under it
        col = mix(col, uMoonColor * (1.95 - 0.5 * maria), disc);

        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });

function makeStars(count: number): BufferGeometry {
  const rand = seededRandom(1947);
  const position = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  const mag = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    // Uniform on the upper hemisphere, kept off the horizon where the mist hides them anyway.
    const y = 0.06 + 0.94 * rand();
    const phi = rand() * Math.PI * 2;
    const r = Math.sqrt(1 - y * y);
    position.set([r * Math.cos(phi), y, r * Math.sin(phi)], i * 3);
    seed[i] = rand();
    mag[i] = Math.pow(rand(), 3.2); // a few bright stars, many faint ones
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(position, 3));
  geometry.setAttribute('aSeed', new BufferAttribute(seed, 1));
  geometry.setAttribute('aMag', new BufferAttribute(mag, 1));
  return geometry;
}

const starMaterial = () =>
  new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    fog: false,
    uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 }, uColor: { value: new Color(colors.cream) } },
    vertexShader: /* glsl */ `
      ${AT_INFINITY}
      attribute float aSeed;
      attribute float aMag;
      uniform float uTime;
      uniform float uPixelRatio;
      varying float vBright;
      void main() {
        gl_Position = skyClip(position).xyww;
        float twinkle = 0.78 + 0.22 * sin(uTime * (0.7 + aSeed * 2.2) + aSeed * 40.0);
        vBright = (0.25 + aMag) * twinkle;
        gl_PointSize = (1.3 + aMag * 2.4) * uPixelRatio;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vBright;
      void main() {
        float r = length(gl_PointCoord - 0.5) * 2.0;
        float a = pow(1.0 - clamp(r, 0.0, 1.0), 1.6);
        gl_FragColor = vec4(uColor * vBright * a * 1.5, 1.0);
      }
    `,
  });

function Stars({ quality }: { quality: QualityTier }) {
  const count = byTier(quality, STAR_COUNT);
  const geometry = useMemo(() => makeStars(count), [count]);
  const material = useMemo(starMaterial, []);
  useDisposable(geometry);
  useDisposable(material);

  useFrame(({ clock, gl }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uPixelRatio.value = gl.getPixelRatio();
  });

  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={-5} />;
}

/**
 * The persistent night sky: gradient, moon and stars. Mounted once by Experience, not by a
 * scene, because scenes 1–4 all play under the same sky and unmount around it. Lite gets the
 * static gradient and moon, without stars.
 */
export function NightSky({ quality }: { quality: QualityTier }) {
  const material = useMemo(domeMaterial, []);
  useDisposable(material);

  return (
    <>
      <mesh material={material} frustumCulled={false} renderOrder={-10}>
        <sphereGeometry args={[1, 24, 12]} />
      </mesh>
      {quality !== 'lite' && <Stars quality={quality} />}
    </>
  );
}
