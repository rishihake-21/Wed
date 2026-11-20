import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { DoubleSide, PlaneGeometry } from 'three'
import type { Group } from 'three'
import type { SceneProgress } from '../../core/types'
import { lerpAngle } from '../../shared/math'
import { motionScale } from '../../shared/motion'
import {
  createFogMaterial,
  FRAG_END_ADD,
  FRAG_FOG,
  FRAG_HEAD,
  FRAG_HEAD_ADD,
  VERT_FOG,
  VERT_HEAD,
} from '../../shared/shaders'
import { FACE_CAMERA, FIGURE_HEIGHT, REVEAL } from './config'
import type { GroomBudget } from './config'
import { FluteRibbon } from './FluteRibbon'
import { FIGURE_PAD, makeFigureTextures } from './silhouette'
import { groomColors } from './palette'

/*
 * Two layers: the figure itself and a golden halo 0.45 units behind it. The stack turns toward the camera
 * but only part of the way (FACE_CAMERA), so the layers keep a little real parallax as the camera passes.
 */

export const FIGURE_VERT = /* glsl */ `
${VERT_HEAD}
uniform float uTime;
varying vec2 vUv;
void main() {
  vec3 pos = position;
  pos.x += sin(uTime * 0.9 + pos.y * 2.2) * 0.018 * (pos.y + 0.5);
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  vUv = uv;
  ${VERT_FOG}
}
`

export const FIGURE_FRAG = /* glsl */ `
${FRAG_HEAD}
uniform sampler2D uMap;
uniform vec3 uLamp;
uniform float uOpacity;
varying vec2 vUv;
void main() {
  vec4 tex = texture2D(uMap, vUv);
  float a = tex.a * uOpacity;
  if (a < 0.01) discard;
  vec3 col = tex.rgb + uLamp * pow(1.0 - vUv.y, 2.0) * 0.18;
  gl_FragColor = vec4(col, a);
  ${FRAG_FOG}
}
`

export const RIM_FRAG = /* glsl */ `
${FRAG_HEAD_ADD}
uniform sampler2D uMap;
uniform float uOpacity;
varying vec2 vUv;
void main() {
  vec4 tex = texture2D(uMap, vUv);
  gl_FragColor = vec4(tex.rgb, tex.a * uOpacity * fogFade());
  ${FRAG_END_ADD}
}
`

/**
 * Where the figure stands (world x, z) and which way the camera arrives from (radians around Y).
 * Both come from the layout and the camera path (groom/stage.ts), not from the live camera.
 */
export interface Framing {
  yaw: number
  x: number
  z: number
}

export interface GroomStackProps {
  progress: SceneProgress
  budget: GroomBudget
  framing: Framing
}

const PLANE_W = FIGURE_HEIGHT / 2 / (1 - 2 * FIGURE_PAD)
const PLANE_H = FIGURE_HEIGHT / (1 - 2 * FIGURE_PAD)

export function GroomStack({ progress, budget, framing }: GroomStackProps) {
  const group = useRef<Group>(null)
  const camera = useThree((s) => s.camera)
  const calm = useMemo(motionScale, [])

  const built = useMemo(() => {
    const c = groomColors()
    const textures = makeFigureTextures(budget.texture)
    const geometry = new PlaneGeometry(1, 1, 1, 10)
    const fillU = { uTime: { value: 0 }, uOpacity: { value: 0 } }
    const rimU = { uTime: { value: 0 }, uOpacity: { value: 0 } }
    const fill = createFogMaterial({
      vertexShader: FIGURE_VERT,
      fragmentShader: FIGURE_FRAG,
      uniforms: { ...fillU, uMap: { value: textures.fill }, uLamp: { value: c.rim } },
      transparent: true,
      // The figure writes depth (its empty pixels are discarded), so the ribbon and feathers that pass
      // behind it are hidden by it instead of drawing over it.
      depthWrite: true,
      side: DoubleSide,
    })
    const rim = createFogMaterial({
      vertexShader: FIGURE_VERT,
      fragmentShader: RIM_FRAG,
      uniforms: { ...rimU, uMap: { value: textures.rim } },
      transparent: true,
      additive: true,
      depthWrite: false,
      side: DoubleSide,
    })
    return { textures, geometry, fill, rim, fillU, rimU }
  }, [budget.texture])

  useEffect(
    () => () => {
      built.textures.fill.dispose()
      built.textures.rim.dispose()
      built.geometry.dispose()
      built.fill.dispose()
      built.rim.dispose()
    },
    [built],
  )

  useFrame((state) => {
    const g = group.current
    if (g) {
      const toCamera = Math.atan2(camera.position.x - framing.x, camera.position.z - framing.z)
      g.rotation.y = lerpAngle(framing.yaw, toCamera, FACE_CAMERA)
    }
    const o = REVEAL.figure(progress.current)
    const t = state.clock.elapsedTime * calm
    built.fillU.uTime.value = t
    built.rimU.uTime.value = t
    built.fillU.uOpacity.value = o
    built.rimU.uOpacity.value = o * (0.85 + 0.15 * Math.sin(t * 1.3))
  })

  return (
    <group ref={group}>
      <mesh
        geometry={built.geometry}
        material={built.rim}
        position={[0, 0, -0.45]}
        scale={[PLANE_W, PLANE_H, 1]}
        renderOrder={2}
        frustumCulled={false}
      />
      <mesh
        geometry={built.geometry}
        material={built.fill}
        scale={[PLANE_W, PLANE_H, 1]}
        renderOrder={3}
        frustumCulled={false}
      />
      <FluteRibbon progress={progress} budget={budget} />
    </group>
  )
}
