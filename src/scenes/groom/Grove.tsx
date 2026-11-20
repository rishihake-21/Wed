import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  BufferGeometry,
  CircleGeometry,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  IcosahedronGeometry,
  InstancedBufferAttribute,
  Object3D,
} from 'three'
import type { InstancedMesh, ShaderMaterial } from 'three'
import { createRng, smoothstep } from '../../shared/math'
import { motionScale } from '../../shared/motion'
import { MOON_DIRECTION } from '../../shared/sky'
import { createFogMaterial, FRAG_FOG, FRAG_FOG_FADE, FRAG_HEAD_FADE, GLSL_NOISE_3D, VERT_FOG, VERT_HEAD } from '../../shared/shaders'
import { GROUND_Y, GROVE_OUTER } from './config'
import type { GroomBudget } from './config'
import { groveLayout } from './groveLayout'
import type { GroveLayout } from './groveLayout'
import { groomColors } from './palette'
import type { GroomColors } from './palette'

/*
 * Everything here is procedural and unlit: colours come from the theme tokens, the "light" is faked in the
 * fragment shaders (the sky's moon direction plus a warm glow from the clearing), and every material is fog-aware.
 * Solid surfaces also dissolve into the fog at the end of the scene (uFade), because the scene unmounts the
 * moment the next one is active.
 * Trees are instanced, so the whole grove is five draw calls (trunks, canopy, flowers, grass, ground).
 */

export const TRUNK_VERT = /* glsl */ `
${VERT_HEAD}
attribute float aSeed;
varying vec3 vN;
varying vec3 vObj;
varying float vSeed;
void main() {
  vec4 wp = instanceMatrix * vec4(position, 1.0);
  vN = normalize(mat3(instanceMatrix) * normal);
  vObj = wp.xyz;
  vSeed = aSeed;
  vec4 mvPosition = modelViewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  ${VERT_FOG}
}
`

export const TRUNK_FRAG = /* glsl */ `
${FRAG_HEAD_FADE}
${GLSL_NOISE_3D}
uniform vec3 uDark;
uniform vec3 uLit;
uniform vec3 uRim;
uniform vec3 uMoon;
varying vec3 vN;
varying vec3 vObj;
varying float vSeed;
void main() {
  vec3 n = normalize(vN);
  float moon = clamp(dot(n, normalize(uMoon)) * 0.5 + 0.5, 0.0, 1.0);
  float streak = vnoise(vec3(vObj.x * 5.0, vObj.y * 1.2 + vSeed * 7.0, vObj.z * 5.0));
  vec3 col = mix(uDark, uLit, moon * 0.65 + streak * 0.35);
  vec3 toCentre = normalize(vec3(-vObj.x, 0.0, -vObj.z) + vec3(0.0001));
  float inward = clamp(dot(n, toCentre), 0.0, 1.0);
  float reach = 1.0 - smoothstep(4.0, 17.0, length(vObj.xz));
  col += uRim * inward * reach * 0.4;
  gl_FragColor = vec4(col, 1.0);
  ${FRAG_FOG_FADE}
}
`

export const CANOPY_VERT = /* glsl */ `
${VERT_HEAD}
${GLSL_NOISE_3D}
uniform float uTime;
attribute float aSeed;
attribute vec3 aTint;
varying vec3 vN;
varying vec3 vObj;
varying float vSeed;
varying vec3 vTint;
void main() {
  vec3 pos = position;
  float bump = vnoise(pos * 3.1 + vec3(aSeed * 17.0)) - 0.5;
  pos += normal * bump * 0.3;
  vec4 base = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  float ph = base.x * 0.31 + base.z * 0.23 + aSeed * 6.2831853;
  float w = sin(uTime * 0.7 + ph) + 0.5 * sin(uTime * 1.9 + ph * 1.7);
  pos.x += w * 0.06;
  pos.z += w * 0.04;
  pos.y += sin(uTime * 1.1 + ph) * 0.03;
  vec4 wp = instanceMatrix * vec4(pos, 1.0);
  vN = normalize(mat3(instanceMatrix) * normal);
  vObj = wp.xyz;
  vSeed = aSeed;
  vTint = aTint;
  vec4 mvPosition = modelViewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  ${VERT_FOG}
}
`

export const CANOPY_FRAG = /* glsl */ `
${FRAG_HEAD_FADE}
${GLSL_NOISE_3D}
uniform vec3 uDeep;
uniform vec3 uLeaf;
uniform vec3 uTeal;
uniform vec3 uRim;
uniform vec3 uMoon;
varying vec3 vN;
varying vec3 vObj;
varying float vSeed;
varying vec3 vTint;
void main() {
  vec3 n = normalize(vN);
  float moon = clamp(dot(n, normalize(uMoon)) * 0.5 + 0.5, 0.0, 1.0);
  float clump = vnoise(vObj * 3.2 + vec3(vSeed * 9.0));
  float shade = clamp(moon * 0.75 + clump * 0.35 - 0.1, 0.0, 1.0);
  vec3 col = mix(uDeep, uLeaf, shade);
  col = mix(col, uTeal, vTint.x * 0.35);
  col *= 0.85 + vTint.y * 0.3;
  vec3 toCentre = normalize(vec3(-vObj.x, -vObj.y * 0.2, -vObj.z) + vec3(0.0001));
  float inward = clamp(dot(n, toCentre), 0.0, 1.0);
  float reach = 1.0 - smoothstep(4.0, 17.0, length(vObj.xz));
  col += uRim * inward * reach * 0.55;
  gl_FragColor = vec4(col, 1.0);
  ${FRAG_FOG_FADE}
}
`

export const FLOWER_VERT = /* glsl */ `
${VERT_HEAD}
uniform float uTime;
attribute float aSeed;
varying vec3 vN;
varying float vSeed;
void main() {
  vec3 pos = position;
  vec4 base = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  float ph = base.x * 0.31 + base.z * 0.23 + aSeed * 6.2831853;
  float w = sin(uTime * 0.7 + ph) + 0.5 * sin(uTime * 1.9 + ph * 1.7);
  pos.x += w * 0.03;
  pos.z += w * 0.02;
  vec4 wp = instanceMatrix * vec4(pos, 1.0);
  vN = normalize(mat3(instanceMatrix) * normal);
  vSeed = aSeed;
  vec4 mvPosition = modelViewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  ${VERT_FOG}
}
`

export const FLOWER_FRAG = /* glsl */ `
${FRAG_HEAD_FADE}
uniform vec3 uGold;
uniform vec3 uMarigold;
uniform float uTime;
varying vec3 vN;
varying float vSeed;
void main() {
  float tw = 0.8 + 0.2 * sin(uTime * 1.7 + vSeed * 40.0);
  float lit = clamp(normalize(vN).y * 0.5 + 0.6, 0.0, 1.0);
  vec3 col = mix(uMarigold, uGold, vSeed) * (0.8 + 0.5 * lit) * tw;
  gl_FragColor = vec4(col, 1.0);
  ${FRAG_FOG_FADE}
}
`

export const GRASS_VERT = /* glsl */ `
${VERT_HEAD}
uniform float uTime;
attribute float aSeed;
varying float vH;
varying float vSeed;
void main() {
  vec3 pos = position;
  float h = pos.y;
  vec4 base = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  float ph = base.x * 0.9 + base.z * 0.7 + aSeed * 6.2831853;
  float w = (sin(uTime * 1.4 + ph) + 0.6 * sin(uTime * 3.1 + ph * 1.9)) * 0.1;
  pos.x += w * h * h;
  vec4 wp = instanceMatrix * vec4(pos, 1.0);
  vH = h;
  vSeed = aSeed;
  vec4 mvPosition = modelViewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  ${VERT_FOG}
}
`

export const GRASS_FRAG = /* glsl */ `
${FRAG_HEAD_FADE}
uniform vec3 uDeep;
uniform vec3 uTip;
varying float vH;
varying float vSeed;
void main() {
  vec3 col = mix(uDeep, uTip, vH * vH) * (0.75 + 0.5 * vSeed);
  gl_FragColor = vec4(col, 1.0);
  ${FRAG_FOG_FADE}
}
`

export const GROUND_VERT = /* glsl */ `
${VERT_HEAD}
varying vec2 vP;
void main() {
  vP = position.xy;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  ${VERT_FOG}
}
`

export const GROUND_FRAG = /* glsl */ `
${FRAG_HEAD_FADE}
${GLSL_NOISE_3D}
uniform vec3 uCentre;
uniform vec3 uEdge;
uniform vec3 uGlow;
uniform float uRadius;
varying vec2 vP;
void main() {
  float d = length(vP);
  float r = d / uRadius;
  vec3 col = mix(uCentre, uEdge, smoothstep(0.0, 0.75, r));
  col *= 0.88 + 0.24 * vnoise(vec3(vP * 0.35, 0.0));
  float pool = exp(-pow(d / 4.0, 2.0));
  col += uGlow * pool * 0.45;
  float a = 1.0 - smoothstep(0.82, 1.0, r);
  gl_FragColor = vec4(col, a * uFade);
  ${FRAG_FOG}
}
`

/* ------------------------------------------------------------------ layout */

const dummy = new Object3D()

/** Writes one instance matrix (position, Y rotation plus optional lean, scale) into `out`. */
function put(
  out: Float32Array,
  i: number,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  ry: number,
  rx = 0,
  rz = 0,
): void {
  dummy.position.set(x, y, z)
  dummy.rotation.set(rx, ry, rz)
  dummy.scale.set(sx, sy, sz)
  dummy.updateMatrix()
  dummy.matrix.toArray(out, i * 16)
}

interface GroveBuffers {
  trunkCount: number
  trunks: Float32Array
  trunkSeed: Float32Array
  canopyCount: number
  canopy: Float32Array
  canopySeed: Float32Array
  canopyTint: Float32Array
  flowerCount: number
  flowers: Float32Array
  flowerSeed: Float32Array
}

/** Turns the pure layout (groveLayout.ts) into the arrays the instanced meshes read. */
function toBuffers(layout: GroveLayout): GroveBuffers {
  const { trees, clusters, blossoms } = layout
  const buffers: GroveBuffers = {
    trunkCount: trees.length,
    trunks: new Float32Array(trees.length * 16),
    trunkSeed: new Float32Array(trees.length),
    canopyCount: clusters.length,
    canopy: new Float32Array(clusters.length * 16),
    canopySeed: new Float32Array(clusters.length),
    canopyTint: new Float32Array(clusters.length * 3),
    flowerCount: blossoms.length,
    flowers: new Float32Array(blossoms.length * 16),
    flowerSeed: new Float32Array(blossoms.length),
  }
  trees.forEach((t, i) => {
    put(buffers.trunks, i, t.x, GROUND_Y, t.z, t.r, t.h, t.r, t.yaw, t.lean, t.lean * 0.6)
    buffers.trunkSeed[i] = t.seed
  })
  clusters.forEach((c, i) => {
    put(buffers.canopy, i, c.x, c.y, c.z, c.sx, c.sy, c.sz, c.yaw)
    buffers.canopySeed[i] = c.seed
    buffers.canopyTint.set(c.tint, i * 3)
  })
  blossoms.forEach((f, i) => {
    put(buffers.flowers, i, f.x, f.y, f.z, f.size, f.size, f.size, 0)
    buffers.flowerSeed[i] = f.seed
  })
  return buffers
}

function buildGrass(count: number): { matrices: Float32Array; seeds: Float32Array } {
  const rng = createRng(77)
  const matrices = new Float32Array(count * 16)
  const seeds = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const a = rng() * Math.PI * 2
    const d = Math.sqrt(rng()) * (GROVE_OUTER + 4)
    const near = smoothstep(0.7, 2.6, d) // shorter blades around the hero's feet
    const s = (0.45 + rng() * 0.75) * (0.35 + 0.65 * near)
    put(matrices, i, Math.sin(a) * d, GROUND_Y, Math.cos(a) * d, s * (0.8 + rng() * 0.8), s, 1, rng() * Math.PI * 2)
    seeds[i] = rng()
  }
  return { matrices, seeds }
}

/* --------------------------------------------------------------- materials */

interface Built {
  geometry: BufferGeometry
  material: ShaderMaterial
}
type Uniform<T> = { value: T }

function makeTrunk(b: GroveBuffers, c: GroomColors, fade: Uniform<number>): Built {
  const geometry = new CylinderGeometry(0.55, 1, 1, 7, 3, true)
  geometry.translate(0, 0.5, 0)
  geometry.setAttribute('aSeed', new InstancedBufferAttribute(b.trunkSeed, 1))
  const material = createFogMaterial({
    vertexShader: TRUNK_VERT,
    fragmentShader: TRUNK_FRAG,
    uniforms: { uDark: { value: c.bark }, uLit: { value: c.barkLit }, uRim: { value: c.rim }, uMoon: { value: MOON_DIRECTION } },
    fade,
  })
  return { geometry, material }
}

function makeCanopy(b: GroveBuffers, detail: number, c: GroomColors, uTime: Uniform<number>, fade: Uniform<number>): Built {
  const geometry = new IcosahedronGeometry(1, detail)
  geometry.setAttribute('aSeed', new InstancedBufferAttribute(b.canopySeed, 1))
  geometry.setAttribute('aTint', new InstancedBufferAttribute(b.canopyTint, 3))
  const material = createFogMaterial({
    vertexShader: CANOPY_VERT,
    fragmentShader: CANOPY_FRAG,
    uniforms: {
      uTime,
      uMoon: { value: MOON_DIRECTION },
      uDeep: { value: c.deep },
      uLeaf: { value: c.leaf },
      uTeal: { value: c.teal },
      uRim: { value: c.rim },
    },
    fade,
  })
  return { geometry, material }
}

function makeFlowers(b: GroveBuffers, c: GroomColors, uTime: Uniform<number>, fade: Uniform<number>): Built {
  const geometry = new IcosahedronGeometry(1, 1)
  geometry.setAttribute('aSeed', new InstancedBufferAttribute(b.flowerSeed, 1))
  const material = createFogMaterial({
    vertexShader: FLOWER_VERT,
    fragmentShader: FLOWER_FRAG,
    uniforms: { uTime, uGold: { value: c.gold }, uMarigold: { value: c.marigold } },
    fade,
  })
  return { geometry, material }
}

function makeGrass(seeds: Float32Array, c: GroomColors, uTime: Uniform<number>, fade: Uniform<number>): Built {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute([-0.045, 0, 0, 0.045, 0, 0, 0, 1, 0], 3))
  geometry.setAttribute('aSeed', new InstancedBufferAttribute(seeds, 1))
  const material = createFogMaterial({
    vertexShader: GRASS_VERT,
    fragmentShader: GRASS_FRAG,
    uniforms: { uTime, uDeep: { value: c.grassDeep }, uTip: { value: c.grassTip } },
    side: DoubleSide,
    fade,
  })
  return { geometry, material }
}

function makeGround(c: GroomColors, fade: Uniform<number>): Built {
  const radius = GROVE_OUTER + 9
  const geometry = new CircleGeometry(radius, 56)
  const material = createFogMaterial({
    vertexShader: GROUND_VERT,
    fragmentShader: GROUND_FRAG,
    uniforms: {
      uRadius: { value: radius },
      uCentre: { value: c.groundCenter },
      uEdge: { value: c.groundEdge },
      uGlow: { value: c.rim },
    },
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    fade,
  })
  return { geometry, material }
}

/* -------------------------------------------------------------- components */

interface PartProps extends Built {
  count: number
  matrices: Float32Array
}

/** One instanced draw call. Geometry and material are disposed when it unmounts (CLAUDE.md). */
function Part({ geometry, material, count, matrices }: PartProps) {
  const ref = useRef<InstancedMesh>(null)

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    mesh.instanceMatrix.array.set(matrices)
    mesh.instanceMatrix.needsUpdate = true
  }, [matrices])

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  if (count <= 0) return null
  return <instancedMesh ref={ref} args={[geometry, material, count]} frustumCulled={false} />
}

export interface GroveProps {
  budget: GroomBudget
  /** 1 while the scene plays, easing to 0 at its end so the grove dissolves instead of popping out. */
  fade: Uniform<number>
}

export function Grove({ budget, fade }: GroveProps) {
  const colors = useMemo(groomColors, [])
  const calm = useMemo(motionScale, [])
  const uTime = useMemo(() => ({ value: 0 }), [])
  const { trees, clustersPerTree, flowersPerTree } = budget
  const buffers = useMemo(
    () => toBuffers(groveLayout({ trees, clustersPerTree, flowersPerTree })),
    [trees, clustersPerTree, flowersPerTree],
  )
  const blades = useMemo(() => buildGrass(budget.grass), [budget.grass])

  const parts = useMemo(
    () => ({
      trunk: makeTrunk(buffers, colors, fade),
      canopy: makeCanopy(buffers, budget.detail, colors, uTime, fade),
      flowers: makeFlowers(buffers, colors, uTime, fade),
      grass: makeGrass(blades.seeds, colors, uTime, fade),
      ground: makeGround(colors, fade),
    }),
    [buffers, blades, budget.detail, colors, uTime, fade],
  )

  // The Parts dispose their own geometry and material; the ground mesh is not a Part, so it is released here.
  useEffect(
    () => () => {
      parts.ground.geometry.dispose()
      parts.ground.material.dispose()
    },
    [parts],
  )

  useFrame((state) => {
    uTime.value = state.clock.elapsedTime * calm
  })

  return (
    <>
      <mesh
        geometry={parts.ground.geometry}
        material={parts.ground.material}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, GROUND_Y - 0.01, 0]}
        renderOrder={-2}
      />
      <Part {...parts.trunk} count={buffers.trunkCount} matrices={buffers.trunks} />
      <Part {...parts.canopy} count={buffers.canopyCount} matrices={buffers.canopy} />
      <Part {...parts.flowers} count={buffers.flowerCount} matrices={buffers.flowers} />
      <Part {...parts.grass} count={budget.grass} matrices={blades.matrices} />
    </>
  )
}
