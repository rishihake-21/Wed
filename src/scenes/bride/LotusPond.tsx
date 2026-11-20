import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferAttribute, BufferGeometry, CircleGeometry, Color, DoubleSide } from 'three';
import type { QualityTier, SceneProgress } from '../../core/types';
import { clamp01 } from '../../core/layout';
import { createInstanced, useDisposable } from '../../shared/particles';
import {
  createFogMaterial,
  FRAG_FOG_FADE,
  FRAG_HEAD_FADE,
  VERT_FOG,
  VERT_HEAD,
} from '../../shared/shaders';
import { MOON_DIRECTION } from '../../shared/sky';
import { colors } from '../../theme/tokens';
import { budgetFor, POND_SCALE, TIMING } from './config';
import { pondLayout } from './pondLayout';
import type { Placement } from './pondLayout';

const toAttributes = (items: readonly Placement[]) => {
  const inst = new Float32Array(items.length * 3);
  const misc = new Float32Array(items.length * 2);
  items.forEach((p, i) => {
    inst.set([p.x, p.z, p.scale], i * 3);
    misc.set([p.phase, p.yaw], i * 2);
  });
  return { aInst: { itemSize: 3, array: inst }, aMisc: { itemSize: 2, array: misc } };
};

// ---------------------------------------------------------------------------
// Lotus flower
// ---------------------------------------------------------------------------

interface Ring {
  petals: number;
  /** How far the petal leans out from vertical when fully open (radians). */
  tilt: number;
  /** Petal length as authored (the instance scale multiplies it). Below 0.2 marks a stamen (drawn gold). */
  length: number;
  turn: number;
}

const RINGS: readonly Ring[] = [
  { petals: 8, tilt: 1.3, length: 0.46, turn: 0 },
  { petals: 6, tilt: 0.85, length: 0.42, turn: 0.3 },
  { petals: 5, tilt: 0.42, length: 0.34, turn: 0.1 },
  { petals: 6, tilt: 0.14, length: 0.16, turn: 0.5 },
];

/**
 * One lotus: four rings of petals, each petal a 3 × 2 strip authored standing upright with a
 * cupped, curling shape. The vertex shader leans the petals out to open the flower.
 */
function makeLotusGeometry(): BufferGeometry {
  const rows = 4; // verts along the petal
  const cols = 3; // verts across
  const position: number[] = [];
  const uv: number[] = [];
  const petal: number[] = [];
  const index: number[] = [];

  for (const ring of RINGS) {
    for (let i = 0; i < ring.petals; i++) {
      const base = position.length / 3;
      const yaw = ring.turn + (i / ring.petals) * Math.PI * 2;
      for (let r = 0; r < rows; r++) {
        const u = r / (rows - 1);
        const width = 0.34 * Math.sin(Math.PI * Math.pow(u, 0.75));
        for (let c = 0; c < cols; c++) {
          const s = (c / (cols - 1)) * 2 - 1;
          position.push(s * width, u, 0.15 * u * u + 0.16 * (1 - s * s) * width);
          uv.push((s + 1) / 2, u);
          petal.push(yaw, ring.tilt, ring.length);
        }
      }
      for (let r = 0; r < rows - 1; r++) {
        for (let c = 0; c < cols - 1; c++) {
          const a = base + r * cols + c;
          index.push(a, a + 1, a + cols, a + 1, a + cols + 1, a + cols);
        }
      }
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(position), 3));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2));
  geometry.setAttribute('aPetal', new BufferAttribute(new Float32Array(petal), 3));
  geometry.setIndex(index);
  return geometry;
}

/** Gentle bob on the water, in step with the figure's scale so it reads at the same distance. */
const GLSL_BOB = /* glsl */ `
  uniform float uTime;
  float bob(float phase) {
    return (0.02 + sin(uTime * 0.9 + phase * 6.283) * 0.01) * ${POND_SCALE.toFixed(3)};
  }
`;

function lotusMaterial(fade: { value: number }) {
  return createFogMaterial({
    side: DoubleSide,
    fade,
    uniforms: {
      uTime: { value: 0 },
      uBloom: { value: 0 },
      uMoonDir: { value: MOON_DIRECTION },
      uBase: { value: new Color(colors.cream) },
      uTip: { value: new Color(colors.lotus) },
      uGold: { value: new Color(colors.gold) },
      uHeart: { value: new Color(colors.marigold) },
    },
    vertexShader: /* glsl */ `
      ${VERT_HEAD}
      ${GLSL_BOB}
      uniform float uBloom;
      attribute vec3 aPetal;   // yaw, tilt when open, length
      attribute vec3 aInst;    // x, z, scale
      attribute vec2 aMisc;    // phase, yaw
      varying vec2 vUv;
      varying vec3 vWorld;
      varying float vOpen;
      varying float vStamen;
      varying float vPhase;
      void main() {
        // Each flower opens a little after the last, so the pond blooms in a wave.
        float open = smoothstep(0.0, 1.0, clamp(uBloom * 1.5 - aMisc.x * 0.5, 0.0, 1.0));
        float tilt = mix(0.1, aPetal.y, open);

        vec3 p = position * aPetal.z;
        float c = cos(tilt), s = sin(tilt);
        p = vec3(p.x, p.y * c - p.z * s, p.y * s + p.z * c);

        float yaw = aPetal.x + aMisc.y;
        float cy = cos(yaw), sy = sin(yaw);
        p = vec3(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy);

        vec3 world = vec3(aInst.x, bob(aMisc.x), aInst.y) + p * aInst.z;
        vWorld = world;
        vUv = uv;
        vOpen = open;
        vStamen = step(aPetal.z, 0.2);
        vPhase = aMisc.x;
        vec4 mvPosition = modelViewMatrix * vec4(world, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        ${VERT_FOG}
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uMoonDir, uBase, uTip, uGold, uHeart;
      varying vec2 vUv;
      varying vec3 vWorld;
      varying float vOpen;
      varying float vStamen;
      varying float vPhase;
      ${FRAG_HEAD_FADE}
      void main() {
        vec3 N = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
        vec3 V = normalize(cameraPosition - vWorld);
        if (dot(N, V) < 0.0) N = -N;               // petals are lit on both sides

        float u = vUv.y;
        vec3 col = mix(uBase, uTip, smoothstep(0.1, 0.95, u));
        col = mix(col, uBase, vPhase * 0.3);        // some flowers paler than others
        col *= 0.93 + 0.07 * sin((vUv.x - 0.5) * 44.0 * (0.4 + u));   // veins

        float moon = dot(N, uMoonDir) * 0.5 + 0.5;
        float rim = pow(1.0 - abs(dot(N, V)), 2.0);
        vec3 lit = col * (0.5 + 0.7 * moon) + uTip * (rim * 0.4 + 0.1);
        lit += uHeart * vOpen * (1.0 - u) * (1.0 - u) * 0.3;   // warm glow at the heart

        lit = mix(lit, uGold * (0.55 + 0.45 * moon), vStamen);
        gl_FragColor = vec4(lit, 1.0);
        ${FRAG_FOG_FADE}
      }
    `,
  });
}

// ---------------------------------------------------------------------------
// Lily pads
// ---------------------------------------------------------------------------

/** A round leaf with a wedge notch and slightly raised rim, lying on the water. */
function makePadGeometry(): BufferGeometry {
  const notch = 0.35;
  const geometry = new CircleGeometry(0.5, 22, notch, Math.PI * 2 - notch);
  geometry.rotateX(-Math.PI / 2);
  const pos = geometry.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const r = Math.hypot(pos.getX(i), pos.getZ(i)) / 0.5;
    pos.setY(i, r * r * 0.05);
  }
  return geometry;
}

function padMaterial(fade: { value: number }) {
  return createFogMaterial({
    side: DoubleSide,
    fade,
    uniforms: {
      uTime: { value: 0 },
      uMoonDir: { value: MOON_DIRECTION },
      uLeaf: { value: new Color(colors.peacock).multiplyScalar(0.34) },
      uEdge: { value: new Color(colors.peacock).lerp(new Color(colors.gold), 0.25).multiplyScalar(0.5) },
    },
    vertexShader: /* glsl */ `
      ${VERT_HEAD}
      ${GLSL_BOB}
      attribute vec3 aInst;   // x, z, scale
      attribute vec2 aMisc;   // phase, yaw
      varying vec3 vLocal;
      varying vec3 vWorld;
      void main() {
        float cy = cos(aMisc.y), sy = sin(aMisc.y);
        vec3 p = vec3(position.x * cy + position.z * sy, position.y, -position.x * sy + position.z * cy);
        vLocal = position;
        vec3 world = vec3(aInst.x, 0.012 * ${POND_SCALE.toFixed(3)} + bob(aMisc.x) * 0.3, aInst.y) + p * aInst.z;
        vWorld = world;
        vec4 mvPosition = modelViewMatrix * vec4(world, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        ${VERT_FOG}
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uMoonDir, uLeaf, uEdge;
      varying vec3 vLocal;
      varying vec3 vWorld;
      ${FRAG_HEAD_FADE}
      void main() {
        float r = length(vLocal.xz) / 0.5;
        float ang = atan(vLocal.z, vLocal.x);
        vec3 col = mix(uLeaf, uEdge, smoothstep(0.55, 1.0, r));
        col *= 0.88 + 0.12 * sin(ang * 14.0) * (1.0 - r * 0.5);      // veins fanning from the stalk

        // Wet sheen where the leaf mirrors the moon.
        vec3 V = normalize(cameraPosition - vWorld);
        vec3 R = reflect(-V, vec3(0.0, 1.0, 0.0));
        col += vec3(0.55, 0.6, 0.5) * pow(max(dot(R, uMoonDir), 0.0), 30.0) * 0.5;

        gl_FragColor = vec4(col, 1.0);
        ${FRAG_FOG_FADE}
      }
    `,
  });
}

// ---------------------------------------------------------------------------

interface LotusPondProps {
  progress: SceneProgress;
  quality: QualityTier;
  /** The scene's shared `uFade` box (sceneFade of progress, written each frame by SceneBride). */
  fade: { value: number };
}

/**
 * The pond's plants: lotuses that open as the scene plays (a ring of them around the bride and
 * the rest scattered) and the lily pads between them. Two instanced meshes, so two draw calls. The
 * layout (pondLayout.ts) keeps every lotus clear of the camera's line.
 */
export function LotusPond({ progress, quality, fade }: LotusPondProps) {
  const budget = budgetFor(quality);

  const { lotusGeometry, padGeometry } = useMemo(() => {
    const { lotuses, pads } = pondLayout(budget);
    return {
      lotusGeometry: createInstanced(lotuses.length, toAttributes(lotuses), makeLotusGeometry()),
      padGeometry: createInstanced(pads.length, toAttributes(pads), makePadGeometry()),
    };
  }, [budget]);
  const lotus = useMemo(() => lotusMaterial(fade), [fade]);
  const pad = useMemo(() => padMaterial(fade), [fade]);
  useDisposable(lotusGeometry);
  useDisposable(padGeometry);
  useDisposable(lotus);
  useDisposable(pad);

  useFrame(({ clock }) => {
    lotus.uniforms.uTime.value = clock.elapsedTime;
    lotus.uniforms.uBloom.value = clamp01(progress.current / TIMING.bloomDone);
    pad.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <>
      <mesh geometry={padGeometry} material={pad} frustumCulled={false} />
      <mesh geometry={lotusGeometry} material={lotus} frustumCulled={false} />
    </>
  );
}
