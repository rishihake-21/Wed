import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferAttribute, BufferGeometry, CatmullRomCurve3, Color, DoubleSide, Vector3 } from 'three';
import type { QualityTier, SceneProgress } from '../../core/types';
import { smoothstep } from '../../shared/math';
import { useDisposable } from '../../shared/particles';
import { createFogMaterial, FRAG_FOG_FADE, FRAG_HEAD_FADE, VERT_FOG, VERT_HEAD } from '../../shared/shaders';
import { MOON_DIRECTION } from '../../shared/sky';
import { colors } from '../../theme/tokens';
import { budgetFor, TIMING } from './config';
import { RIBBON_TILE, RIBBON_WIDTH, ribbonPoints } from './ribbonPath';
import { BRIDE_SPOT } from './stage';

/** The pattern and the cloth flutter were authored for a 0.85 m ribbon; they scale with the real width. */
const DESIGN_WIDTH = 0.85;
const SCALE = RIBBON_WIDTH / DESIGN_WIDTH;

function makeCurve(): CatmullRomCurve3 {
  return new CatmullRomCurve3(ribbonPoints().map(([x, y, z]) => new Vector3(x, y, z)), false, 'centripetal');
}

/** A strip along the curve: `uv.x` runs 0–1 along it, `uv.y` 0–1 across. Slowly twists as it goes. */
function makeRibbonGeometry(curve: CatmullRomCurve3, along: number, across: number): BufferGeometry {
  const position: number[] = [];
  const uv: number[] = [];
  const index: number[] = [];
  const point = new Vector3();
  const tangent = new Vector3();
  const side = new Vector3();
  const lift = new Vector3();
  const up = new Vector3(0, 1, 0);

  for (let i = 0; i <= along; i++) {
    const u = i / along;
    curve.getPointAt(u, point);
    curve.getTangentAt(u, tangent);
    side.crossVectors(tangent, up).normalize();
    lift.crossVectors(side, tangent).normalize();
    const twist = Math.sin(u * 9.0) * 0.55 + 0.35;
    for (let j = 0; j <= across; j++) {
      const v = j / across;
      const offset = (v - 0.5) * RIBBON_WIDTH;
      position.push(
        point.x + (side.x * Math.cos(twist) + lift.x * Math.sin(twist)) * offset,
        point.y + (side.y * Math.cos(twist) + lift.y * Math.sin(twist)) * offset,
        point.z + (side.z * Math.cos(twist) + lift.z * Math.sin(twist)) * offset,
      );
      uv.push(u, v);
    }
  }
  const row = across + 1;
  for (let i = 0; i < along; i++) {
    for (let j = 0; j < across; j++) {
      const a = i * row + j;
      index.push(a, a + row, a + 1, a + 1, a + row, a + row + 1);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(position), 3));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2));
  geometry.setIndex(index);
  return geometry;
}

function makeMaterial(length: number, fade: { value: number }) {
  return createFogMaterial({
    side: DoubleSide,
    fade,
    uniforms: {
      uTime: { value: 0 },
      uReveal: { value: 0 },
      uLength: { value: length },
      uMoonDir: { value: MOON_DIRECTION },
      uField: { value: new Color(colors.peacock).multiplyScalar(0.55) },
      uFieldDeep: { value: new Color(colors.peacock).lerp(new Color(colors.midnight), 0.6) },
      uGold: { value: new Color(colors.gold) },
      uTeal: { value: new Color(colors.yamuna) },
      uPink: { value: new Color(colors.lotus) },
    },
    vertexShader: /* glsl */ `
      ${VERT_HEAD}
      uniform float uTime;
      uniform float uReveal;
      uniform float uLength;
      varying vec2 vUv;
      varying vec3 vWorld;
      void main() {
        vec3 p = position;
        // Cloth flutter, stronger at the edges. Its wavelength and height scale with the ribbon.
        float edge = abs(uv.y - 0.5) * 2.0;
        p.y += sin(uv.x * uLength - uTime * 3.0) * 0.05 * ${SCALE.toFixed(3)} * (0.3 + edge);
        // The head of the unfurling ribbon lifts and curls as it is thrown out.
        float behind = uReveal - uv.x;
        p.y += smoothstep(0.07, 0.0, behind) * step(0.0, behind) * 0.3 * ${SCALE.toFixed(3)};
        vUv = uv;
        vWorld = (modelMatrix * vec4(p, 1.0)).xyz;
        vec4 mvPosition = viewMatrix * vec4(vWorld, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        ${VERT_FOG}
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uReveal;
      uniform float uLength;
      uniform vec3 uMoonDir, uField, uFieldDeep, uGold, uTeal, uPink;
      varying vec2 vUv;
      varying vec3 vWorld;
      ${FRAG_HEAD_FADE}

      const float TILE = ${RIBBON_TILE.toFixed(3)};
      const float WIDTH = ${RIBBON_WIDTH.toFixed(3)};
      const float FINE = ${(1 / SCALE).toFixed(4)};   // weave and fringe frequencies were set for a thinner ribbon

      void main() {
        if (vUv.x > uReveal) discard;

        // Pattern coordinates: s counts repeats along the ribbon; q is one repeat, centred,
        // in units of half the ribbon width (so the eye motif is round).
        float s = vUv.x * uLength / TILE;
        float t = vUv.y;
        vec2 q = vec2((fract(s) - 0.5) * TILE / (WIDTH * 0.5), (t - 0.5) * 2.0);
        float d = length(q);
        float ang = atan(q.y, q.x);

        // Woven ground: peacock-green twill.
        float twill = 0.82 + 0.18 * sin((s * TILE + t * WIDTH) * 260.0 * FINE);
        vec3 col = mix(uFieldDeep, uField, 0.5 + 0.5 * sin(s * 6.2831 + t * 3.0)) * twill;
        float zari = 0.0;

        // Zari edge bands, with a zigzag (kanga) just inside each.
        float edgeBand = step(t, 0.07) + step(0.93, t);
        float fine = 0.5 + 0.5 * sin(vUv.x * uLength * 90.0 * FINE);
        col = mix(col, uGold * (0.62 + 0.28 * fine), edgeBand);
        zari += edgeBand;
        float tri = abs(fract(s * 7.0) - 0.5) * 2.0;
        float zig = step(0.07, t) * step(t, 0.07 + 0.045 * (1.0 - tri)) + step(0.93 - 0.045 * (1.0 - tri), t) * step(t, 0.93);
        col = mix(col, uGold * 0.9, zig);
        zari += zig;

        // The peacock eye: gold ring, teal, lotus pink, gold heart.
        float ring = smoothstep(0.7, 0.66, d) * smoothstep(0.5, 0.54, d);
        col = mix(col, uTeal * 0.95, smoothstep(0.54, 0.5, d) * smoothstep(0.3, 0.34, d));
        col = mix(col, uPink * 0.9, smoothstep(0.34, 0.3, d) * smoothstep(0.14, 0.18, d));
        col = mix(col, uGold, smoothstep(0.16, 0.12, d));
        col = mix(col, uGold, ring);
        zari += ring + smoothstep(0.16, 0.12, d);

        // Feather barbs fanning above and below the eye.
        float barbs = smoothstep(0.55, 0.9, abs(sin(ang * 13.0))) * smoothstep(0.7, 0.76, d) * smoothstep(0.98, 0.86, d);
        barbs *= step(abs(q.x), 0.8);
        col = mix(col, uGold * 0.85, barbs * 0.75);
        zari += barbs * 0.6;

        // Lotus pink diamonds where one repeat meets the next.
        float diamond = abs(abs(q.x) - TILE / WIDTH) + abs(q.y) * 1.15;
        col = mix(col, uPink * 0.85, smoothstep(0.34, 0.3, diamond));
        col = mix(col, uGold, smoothstep(0.36, 0.34, diamond) * smoothstep(0.28, 0.32, diamond));
        zari += smoothstep(0.36, 0.34, diamond) * smoothstep(0.28, 0.32, diamond);

        // Lighting: two-sided, moon sheen on the zari.
        vec3 N = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
        vec3 V = normalize(cameraPosition - vWorld);
        if (dot(N, V) < 0.0) N = -N;
        float moon = dot(N, uMoonDir) * 0.5 + 0.5;
        col *= 0.5 + 0.5 * moon;
        vec3 R = reflect(-V, N);
        float spec = pow(max(dot(R, uMoonDir), 0.0), 14.0);
        col += uGold * clamp(zari, 0.0, 1.0) * spec * 1.4;

        // The head of the ribbon glows as it unfurls.
        float head = smoothstep(0.03, 0.0, uReveal - vUv.x);
        col += uGold * head * 2.0;

        gl_FragColor = vec4(col, 1.0);
        ${FRAG_FOG_FADE}
      }
    `,
  });
}

interface PaithaniRibbonProps {
  progress: SceneProgress;
  quality: QualityTier;
  /** The scene's shared `uFade` box (see SceneBride). */
  fade: { value: number };
}

/**
 * A Paithani-style border unfurling over the pond like a ribbon: peacock-green silk with zari
 * edges, a zigzag, and a repeating peacock-eye motif drawn entirely in the fragment shader.
 * The scene's progress sets how much of the ribbon has been revealed. Its path (ribbonPath.ts) winds
 * around the far side of the bride, clear of where the camera flies.
 */
export function PaithaniRibbon({ progress, quality, fade }: PaithaniRibbonProps) {
  const { ribbonAlong, ribbonAcross } = budgetFor(quality);
  const { geometry, length } = useMemo(() => {
    const curve = makeCurve();
    return { geometry: makeRibbonGeometry(curve, ribbonAlong, ribbonAcross), length: curve.getLength() };
  }, [ribbonAlong, ribbonAcross]);
  const material = useMemo(() => makeMaterial(length, fade), [length, fade]);
  useDisposable(geometry);
  useDisposable(material);

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uReveal.value = smoothstep(TIMING.unfurl[0], TIMING.unfurl[1], progress.current);
  });

  return <mesh geometry={geometry} material={material} position={BRIDE_SPOT} frustumCulled={false} />;
}
