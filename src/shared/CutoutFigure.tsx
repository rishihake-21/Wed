import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { CanvasTexture, Color, DoubleSide, LinearFilter, SRGBColorSpace } from 'three';
import type { Group } from 'three';
import type { QualityTier, SceneProgress, Vec3 } from '../core/types';
import { clamp01 } from '../core/layout';
import { colors } from '../theme/tokens';
import { GLSL_NOISE } from './glsl';
import { lerpAngle } from './math';
import { useDisposable } from './particles';
import { createFogMaterial, FRAG_END_ADD, FRAG_FOG, FRAG_HEAD, FRAG_HEAD_ADD, VERT_FOG, VERT_HEAD } from './shaders';
import { byTier } from './tier';

/** Draws a silhouette in white on a transparent canvas of the given size. */
export type DrawSilhouette = (ctx: CanvasRenderingContext2D, width: number, height: number) => void;

interface CutoutFigureProps {
  quality: QualityTier;
  progress: SceneProgress;
  /** Scene-local position of the figure's feet. */
  position: Vec3;
  /** World x, z of the figure's feet, to find the bearing to the camera. */
  world: readonly [number, number];
  /** Direction, radians around Y, from the figure toward where the camera arrives from (see bride/stage.ts). */
  arrivalYaw: number;
  /** How far the figure turns from that direction toward the live camera, 0–1. Less than 1 keeps some parallax between the layers. */
  follow: number;
  /** Figure height in metres. */
  height: number;
  /** Width / height of the silhouette canvas. */
  aspect: number;
  /** Placeholder art. Swap for a real cut-out image later without touching the scene. */
  draw: DrawSilhouette;
  /** Progress windows for materialising and for dissolving again. */
  appear: readonly [number, number];
  vanish: readonly [number, number];
}

const TEXTURE_HEIGHT = { high: 1024, medium: 768, low: 512 } as const;

const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Shared vertex shader for the three layers: a plane, fogged like everything else in the scene. */
const VERTEX = /* glsl */ `
  ${VERT_HEAD}
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    ${VERT_FOG}
  }
`;

function makeFigureMaterial(map: CanvasTexture, texel: number) {
  return createFogMaterial({
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    uniforms: {
      uMap: { value: map },
      uTexel: { value: texel },
      uAppear: { value: 0 },
      uBody: { value: new Color(colors.midnight).multiplyScalar(0.42) },
      uBodyTop: { value: new Color(colors.midnight).lerp(new Color(colors.yamuna), 0.22).multiplyScalar(0.7) },
      uRim: { value: new Color(colors.cream) },
      uGold: { value: new Color(colors.gold) },
    },
    vertexShader: VERTEX,
    fragmentShader: /* glsl */ `
      ${FRAG_HEAD}
      ${GLSL_NOISE}
      uniform sampler2D uMap;
      uniform float uTexel;
      uniform float uAppear;
      uniform vec3 uBody, uBodyTop, uRim, uGold;
      varying vec2 vUv;
      void main() {
        float a = texture2D(uMap, vUv).a;
        // Rim light from the moon side (upper right): lit where the neighbour toward the moon is empty.
        float inner = texture2D(uMap, vUv + vec2(3.0, 3.0) * uTexel).a;
        float rim = clamp(a - inner, 0.0, 1.0);

        // Materialise bottom-up through a noisy front, with a gold edge on the front itself.
        float n = noise21(vUv * vec2(7.0, 14.0));
        float front = uAppear * 1.5 - (1.0 - vUv.y) * 0.5 - n * 0.3;
        float shown = smoothstep(0.0, 0.2, front);
        float edge = smoothstep(0.0, 0.1, front) * (1.0 - smoothstep(0.1, 0.32, front));

        vec3 col = mix(uBody, uBodyTop, vUv.y);
        col += uRim * rim * 1.15;
        col += uGold * edge * 2.2;
        // Feet melt into the water mist.
        float feet = smoothstep(0.0, 0.14, vUv.y);
        gl_FragColor = vec4(col, a * shown * feet);
        ${FRAG_FOG}
      }
    `,
  });
}

function makeGlowMaterial() {
  return createFogMaterial({
    transparent: true,
    additive: true,
    depthWrite: false,
    uniforms: { uAppear: { value: 0 }, uColor: { value: new Color(colors.lotus).lerp(new Color(colors.gold), 0.35) } },
    vertexShader: VERTEX,
    fragmentShader: /* glsl */ `
      ${FRAG_HEAD_ADD}
      uniform float uAppear;
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        vec2 q = (vUv - vec2(0.5, 0.58)) * vec2(1.0, 0.85);
        float glow = exp(-dot(q, q) * 9.0) * 0.55 * smoothstep(0.5, 0.18, length(vUv - 0.5));
        gl_FragColor = vec4(uColor * glow * uAppear * fogFade(), 1.0);
        ${FRAG_END_ADD}
      }
    `,
  });
}

function makeMistMaterial() {
  return createFogMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uAppear: { value: 0 }, uColor: { value: new Color(colors.midnight).lerp(new Color(colors.yamuna), 0.3) } },
    vertexShader: VERTEX,
    fragmentShader: /* glsl */ `
      ${FRAG_HEAD_ADD}
      ${GLSL_NOISE}
      uniform float uAppear;
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        float band = smoothstep(0.5, 0.0, vUv.y) * smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x);
        float wisps = 0.6 + 0.4 * noise21(vUv * vec2(6.0, 3.0));
        gl_FragColor = vec4(uColor, band * wisps * 0.55 * uAppear * fogFade());
        ${FRAG_END_ADD}
      }
    `,
  });
}

/**
 * A stylised cut-out figure in three depth layers: a soft glow behind, the silhouette, and a
 * band of mist in front of its feet. The layers sit at fixed depths in the figure's group, which turns
 * toward the camera but only part of the way (`follow`), so as the camera moves they slide against
 * each other (parallax) instead of reading as one flat card. The silhouette is a placeholder drawn on a
 * canvas by `draw`; it materialises and dissolves with the scene's progress (all three layers are
 * gone by the end of `vanish`, which must come before the scene's own fade-out starts).
 */
export function CutoutFigure({ quality, progress, position, world, arrivalYaw, follow, height, aspect, draw, appear, vanish }: CutoutFigureProps) {
  const pixelHeight = byTier(quality, TEXTURE_HEIGHT);
  const group = useRef<Group>(null);
  const camera = useThree((s) => s.camera);
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(pixelHeight * aspect);
    canvas.height = pixelHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) draw(ctx, canvas.width, canvas.height);
    const t = new CanvasTexture(canvas);
    t.colorSpace = SRGBColorSpace;
    t.minFilter = LinearFilter;
    t.generateMipmaps = false;
    return t;
  }, [pixelHeight, aspect, draw]);
  const figure = useMemo(() => makeFigureMaterial(texture, 1 / pixelHeight), [texture, pixelHeight]);
  const glow = useMemo(makeGlowMaterial, []);
  const mist = useMemo(makeMistMaterial, []);
  useDisposable(texture);
  useDisposable(figure);
  useDisposable(glow);
  useDisposable(mist);

  const width = height * aspect;

  useFrame(() => {
    const p = progress.current;
    const visible = smooth(appear[0], appear[1], p) * (1 - smooth(vanish[0], vanish[1], p));
    // The silhouette dissolves with the same noise front it appeared with, in reverse.
    figure.uniforms.uAppear.value = visible;
    glow.uniforms.uAppear.value = visible;
    mist.uniforms.uAppear.value = visible;
    const g = group.current;
    if (g) {
      const toCamera = Math.atan2(camera.position.x - world[0], camera.position.z - world[1]);
      g.rotation.y = lerpAngle(arrivalYaw, toCamera, follow);
    }
  });

  return (
    <group ref={group} position={position}>
      <mesh position={[0, height * 0.5, -0.7 * (height / 1.7)]} renderOrder={6}>
        <planeGeometry args={[height * 1.5, height * 1.3]} />
        <primitive object={glow} attach="material" />
      </mesh>
      <mesh position={[0, height * 0.5, 0]} renderOrder={7}>
        <planeGeometry args={[width, height]} />
        <primitive object={figure} attach="material" />
      </mesh>
      <mesh position={[0, height * 0.14, 0.45 * (height / 1.7)]} renderOrder={8}>
        <planeGeometry args={[height * 1.1, height * 0.4]} />
        <primitive object={mist} attach="material" />
      </mesh>
    </group>
  );
}
