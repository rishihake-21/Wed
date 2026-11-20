import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferGeometry, CatmullRomCurve3, Float32BufferAttribute, TubeGeometry, Vector3 } from 'three'
import { createRng } from '../../shared/math'
import { motionScale } from '../../shared/motion'
import { createFogMaterial, FRAG_END_ADD, FRAG_HEAD_ADD, VERT_FOG, VERT_HEAD } from '../../shared/shaders'
import { ribbonPoints } from './ribbonPath'
import { REVEAL } from './config'
import type { GroomBudget } from './config'
import { groomColors } from './palette'
import type { SceneProgress } from '../../core/types'

/*
 * The melody leaves the end of the flute and spirals up around the figure. It is drawn on as the scene
 * progresses, a bright pulse keeps travelling along it, and a few sparkles twinkle where it has been.
 * Coordinates are in the figure's own space (the figure stands centred on the origin, 4.6 units tall).
 */

const TUBE_RADIUS = 0.05
const HALO_RADIUS = 0.2

export const RIBBON_VERT = /* glsl */ `
${VERT_HEAD}
uniform float uR;
varying float vU;
varying vec3 vN;
varying vec3 vV;
void main() {
  float u = uv.x;
  float taper = smoothstep(0.0, 0.06, u) * (1.0 - 0.55 * smoothstep(0.65, 1.0, u));
  vec3 centre = position - normal * uR;
  vec3 pos = centre + normal * uR * taper;
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  vU = u;
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mvPosition.xyz);
  ${VERT_FOG}
}
`

export const RIBBON_FRAG = /* glsl */ `
${FRAG_HEAD_ADD}
uniform float uTime;
uniform float uReveal;
uniform float uOpacity;
uniform float uHalo;
uniform vec3 uGold;
uniform vec3 uCream;
uniform vec3 uTeal;
varying float vU;
varying vec3 vN;
varying vec3 vV;
void main() {
  float drawn = 1.0 - smoothstep(uReveal - 0.03, uReveal, vU);
  float head = fract(uTime * 0.14);
  float behind = fract(head - vU);
  float pulse = exp(-behind * 8.0);
  float shimmer = 0.5 + 0.5 * sin(vU * 46.0 - uTime * 2.4);
  float facing = abs(dot(normalize(vN), normalize(vV)));
  float core = mix(pow(facing, 1.5), pow(facing, 0.6), uHalo);
  vec3 col = mix(uGold, uTeal, vU * 0.55);
  col = mix(col, uCream, pulse * 0.8);
  float body = mix(0.55, 0.12, uHalo) * (0.7 + 0.3 * shimmer);
  float hot = pulse * mix(0.9, 0.35, uHalo);
  float a = drawn * core * (body + hot);
  gl_FragColor = vec4(col, a * uOpacity * fogFade());
  ${FRAG_END_ADD}
}
`

export const SPARKLE_VERT = /* glsl */ `
${VERT_HEAD}
uniform float uTime;
uniform float uReveal;
uniform float uPR;
attribute float aU;
attribute float aPhase;
attribute float aSize;
varying float vTw;
void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  float shown = 1.0 - smoothstep(uReveal - 0.04, uReveal, aU);
  float tw = 0.5 + 0.5 * sin(uTime * 3.0 + aPhase * 6.2831853);
  vTw = tw * shown;
  gl_PointSize = aSize * uPR * (180.0 / max(0.5, -mvPosition.z));
  ${VERT_FOG}
}
`

export const SPARKLE_FRAG = /* glsl */ `
${FRAG_HEAD_ADD}
uniform vec3 uColor;
uniform float uOpacity;
varying float vTw;
void main() {
  vec2 d = gl_PointCoord - vec2(0.5);
  float r = length(d) * 2.0;
  float glow = exp(-r * r * 4.0);
  gl_FragColor = vec4(uColor, glow * vTw * uOpacity * fogFade());
  ${FRAG_END_ADD}
}
`

/** From the flute's end, spiralling up and around the figure (control points in ribbonPath.ts). */
export function ribbonCurve(): CatmullRomCurve3 {
  return new CatmullRomCurve3(ribbonPoints().map(([x, y, z]) => new Vector3(x, y, z)), false, 'catmullrom', 0.5)
}

export interface FluteRibbonProps {
  progress: SceneProgress
  budget: GroomBudget
}

export function FluteRibbon({ progress, budget }: FluteRibbonProps) {
  const calm = useMemo(motionScale, [])

  const built = useMemo(() => {
    const c = groomColors()
    const curve = ribbonCurve()
    const shared = { uTime: { value: 0 }, uReveal: { value: 0 }, uOpacity: { value: 0 } }
    const look = { uGold: { value: c.gold }, uCream: { value: c.cream }, uTeal: { value: c.teal } }

    const coreGeometry = new TubeGeometry(curve, budget.ribbonSegments, TUBE_RADIUS, 5, false)
    const haloGeometry = new TubeGeometry(curve, Math.round(budget.ribbonSegments * 0.6), HALO_RADIUS, 6, false)
    const make = (radius: number, halo: number) =>
      createFogMaterial({
        vertexShader: RIBBON_VERT,
        fragmentShader: RIBBON_FRAG,
        uniforms: { ...shared, ...look, uR: { value: radius }, uHalo: { value: halo } },
        transparent: true,
        additive: true,
        depthWrite: false,
      })
    const coreMaterial = make(TUBE_RADIUS, 0)
    const haloMaterial = make(HALO_RADIUS, 1)

    // Sparkles scattered along the ribbon
    let sparkles: { geometry: BufferGeometry; material: ReturnType<typeof createFogMaterial>; pr: { value: number } } | null = null
    const count = budget.sparkles
    if (count > 0) {
      const rng = createRng(31)
      const position = new Float32Array(count * 3)
      const u = new Float32Array(count)
      const phase = new Float32Array(count)
      const size = new Float32Array(count)
      for (let i = 0; i < count; i++) {
        const t = Math.min(0.999, (i + rng() * 0.8) / count)
        const p = curve.getPointAt(t)
        position[i * 3] = p.x + (rng() - 0.5) * 0.5
        position[i * 3 + 1] = p.y + (rng() - 0.5) * 0.5
        position[i * 3 + 2] = p.z + (rng() - 0.5) * 0.5
        u[i] = t
        phase[i] = rng()
        size[i] = 0.5 + rng() * 0.9
      }
      const geometry = new BufferGeometry()
      geometry.setAttribute('position', new Float32BufferAttribute(position, 3))
      geometry.setAttribute('aU', new Float32BufferAttribute(u, 1))
      geometry.setAttribute('aPhase', new Float32BufferAttribute(phase, 1))
      geometry.setAttribute('aSize', new Float32BufferAttribute(size, 1))
      const pr = { value: 1 }
      const material = createFogMaterial({
        vertexShader: SPARKLE_VERT,
        fragmentShader: SPARKLE_FRAG,
        uniforms: { ...shared, uPR: pr, uColor: { value: c.cream } },
        transparent: true,
        additive: true,
        depthWrite: false,
      })
      sparkles = { geometry, material, pr }
    }

    return { shared, coreGeometry, haloGeometry, coreMaterial, haloMaterial, sparkles }
  }, [budget.ribbonSegments, budget.sparkles])

  useEffect(
    () => () => {
      built.coreGeometry.dispose()
      built.haloGeometry.dispose()
      built.coreMaterial.dispose()
      built.haloMaterial.dispose()
      built.sparkles?.geometry.dispose()
      built.sparkles?.material.dispose()
    },
    [built],
  )

  useFrame((state) => {
    const p = progress.current
    built.shared.uTime.value = state.clock.elapsedTime * calm
    built.shared.uReveal.value = REVEAL.ribbon(p) * 1.06
    built.shared.uOpacity.value = REVEAL.ambient(p)
    if (built.sparkles) built.sparkles.pr.value = state.gl.getPixelRatio()
  })

  return (
    <group>
      <mesh geometry={built.haloGeometry} material={built.haloMaterial} renderOrder={6} frustumCulled={false} />
      <mesh geometry={built.coreGeometry} material={built.coreMaterial} renderOrder={7} frustumCulled={false} />
      {built.sparkles && (
        <points geometry={built.sparkles.geometry} material={built.sparkles.material} renderOrder={8} frustumCulled={false} />
      )}
    </group>
  )
}
