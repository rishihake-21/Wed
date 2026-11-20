import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, PlaneGeometry } from 'three'
import type { ColorRepresentation } from 'three'
import { motionScale } from './motion'
import { createFogMaterial, FRAG_END_ADD, FRAG_HEAD_ADD, VERT_FOG, VERT_HEAD } from './shaders'

/**
 * A soft radial glow that always faces the camera. The billboarding happens in the vertex shader,
 * and `push` moves it away from the camera along the view direction so it sits behind the object at `position`.
 */

export const GLOW_VERT = /* glsl */ `
${VERT_HEAD}
uniform float uSize;
uniform float uPush;
varying vec2 vP;
void main() {
  vec4 mvPosition = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  mvPosition.z -= uPush;
  mvPosition.xy += position.xy * uSize;
  gl_Position = projectionMatrix * mvPosition;
  vP = position.xy * 2.0;
  ${VERT_FOG}
}
`

export const GLOW_FRAG = /* glsl */ `
${FRAG_HEAD_ADD}
uniform vec3 uColor;
uniform float uIntensity;
uniform float uOpacity;
uniform float uTime;
varying vec2 vP;
void main() {
  float d = length(vP);
  float falloff = exp(-d * d * 3.2) * (1.0 - smoothstep(0.8, 1.0, d));
  float breathe = 0.92 + 0.08 * sin(uTime * 0.9);
  gl_FragColor = vec4(uColor * uIntensity, falloff * uOpacity * breathe * fogFade());
  ${FRAG_END_ADD}
}
`

export interface GlowProps {
  color: ColorRepresentation
  size: number
  intensity?: number
  push?: number
  /** A 0..1 box read every frame. */
  opacity?: { current: number }
  position?: [number, number, number]
  renderOrder?: number
}

export function Glow({ color, size, intensity = 1, push = 0, opacity, position, renderOrder = 1 }: GlowProps) {
  const calm = useMemo(motionScale, [])
  const built = useMemo(() => {
    const uniforms = {
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uSize: { value: size },
      uPush: { value: push },
      uColor: { value: new Color(color) },
      uIntensity: { value: intensity },
    }
    const material = createFogMaterial({
      vertexShader: GLOW_VERT,
      fragmentShader: GLOW_FRAG,
      uniforms,
      transparent: true,
      additive: true,
      depthWrite: false,
    })
    return { geometry: new PlaneGeometry(1, 1), material, uniforms }
  }, [color, size, push, intensity])

  useEffect(
    () => () => {
      built.geometry.dispose()
      built.material.dispose()
    },
    [built],
  )

  useFrame((state) => {
    built.uniforms.uTime.value = state.clock.elapsedTime * calm
    built.uniforms.uOpacity.value = opacity ? opacity.current : 1
  })

  return (
    <mesh
      geometry={built.geometry}
      material={built.material}
      position={position}
      renderOrder={renderOrder}
      frustumCulled={false}
    />
  )
}
