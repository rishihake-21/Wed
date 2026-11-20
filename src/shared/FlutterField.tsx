import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, DoubleSide, InstancedBufferAttribute, PlaneGeometry, Vector2 } from 'three'
import type { Texture } from 'three'
import { createRng } from './math'
import { motionScale } from './motion'
import { createFogMaterial, FRAG_FOG, FRAG_HEAD, VERT_FOG, VERT_HEAD } from './shaders'

/**
 * Textured quads that drift, tumble and wrap around inside a cylinder.
 * All motion is computed in the vertex shader from a time uniform, so there is no per-frame CPU work
 * per particle. Reused by the groom scene (peacock feathers) and the bride scene (petals).
 */

export const FLUTTER_VERT = /* glsl */ `
${VERT_HEAD}
uniform float uTime;
uniform vec2 uSize;
uniform float uHeight;
uniform float uBaseY;
uniform float uFall;
uniform float uSway;
uniform float uSpin;
attribute vec3 aBase;
attribute vec4 aRand;
varying vec2 vUv;
varying float vFade;
varying float vTw;
void main() {
  float speed = mix(0.6, 1.3, aRand.x);
  float y = mod(aBase.y - uTime * uFall * speed, uHeight);
  float ph = aRand.y * 6.2831853;
  vec3 centre = vec3(
    aBase.x + sin(uTime * 0.45 * speed + ph) * uSway,
    uBaseY + y,
    aBase.z + cos(uTime * 0.37 * speed + ph * 1.3) * uSway
  );
  float yaw = aRand.z * 6.2831853 + uTime * uSpin * (aRand.w - 0.5);
  float tilt = 0.7 * sin(uTime * 0.9 * speed + ph * 2.0);
  float s = mix(0.7, 1.3, aRand.w);
  vec3 p = vec3(position.x * uSize.x * s, position.y * uSize.y * s, 0.0);
  float ct = cos(tilt);
  float st = sin(tilt);
  p = vec3(p.x, p.y * ct - p.z * st, p.y * st + p.z * ct);
  float cy = cos(yaw);
  float sy = sin(yaw);
  p = vec3(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy);
  vec4 mvPosition = modelViewMatrix * vec4(centre + p, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  vUv = uv;
  vFade = smoothstep(0.0, 0.8, y) * (1.0 - smoothstep(uHeight - 1.0, uHeight, y));
  vTw = 0.5 + 0.5 * sin(uTime * 2.0 * speed + ph * 3.0);
  ${VERT_FOG}
}
`

export const FLUTTER_FRAG = /* glsl */ `
${FRAG_HEAD}
uniform sampler2D uMap;
uniform vec3 uTint;
uniform float uGlow;
uniform float uOpacity;
varying vec2 vUv;
varying float vFade;
varying float vTw;
void main() {
  vec4 tex = texture2D(uMap, vUv);
  float a = tex.a * vFade * uOpacity;
  if (a < 0.01) discard;
  vec3 col = tex.rgb * uTint;
  col += col * vTw * uGlow;
  gl_FragColor = vec4(col, a);
  ${FRAG_FOG}
}
`

export interface FlutterFieldProps {
  texture: Texture
  count: number
  /** The cylinder the particles live in (local space). */
  radius: number
  height: number
  /** Local y of the cylinder's floor. */
  baseY?: number
  /** Keep this middle part free so particles do not cover the hero. */
  innerRadius?: number
  /** Quad size (width, height) before the per-particle size variation. */
  size: [number, number]
  /** Units per second; negative values rise instead of fall. */
  fall?: number
  /** Horizontal drift amplitude in units. */
  sway?: number
  /** Tumble speed. */
  spin?: number
  tint?: string
  /** Brightness pulse added on top of the texture colour (0 = none). */
  glow?: number
  /** A 0..1 box read every frame, so the scene can fade the whole field in and out. */
  opacity?: { current: number }
  seed?: number
}

export function FlutterField({
  texture,
  count,
  radius,
  height,
  baseY = 0,
  innerRadius = 0,
  size,
  fall = 0.5,
  sway = 0.8,
  spin = 1.2,
  tint = '#ffffff',
  glow = 0.25,
  opacity,
  seed = 11,
}: FlutterFieldProps) {
  const calm = useMemo(motionScale, [])
  const [sizeX, sizeY] = size

  const built = useMemo(() => {
    const rng = createRng(seed)
    const base = new Float32Array(count * 3)
    const rand = new Float32Array(count * 4)
    for (let i = 0; i < count; i++) {
      const r = innerRadius + Math.sqrt(rng()) * (radius - innerRadius)
      const a = rng() * Math.PI * 2
      base[i * 3] = Math.sin(a) * r
      base[i * 3 + 1] = rng() * height
      base[i * 3 + 2] = Math.cos(a) * r
      for (let k = 0; k < 4; k++) rand[i * 4 + k] = rng()
    }
    const geometry = new PlaneGeometry(1, 1)
    geometry.setAttribute('aBase', new InstancedBufferAttribute(base, 3))
    geometry.setAttribute('aRand', new InstancedBufferAttribute(rand, 4))

    const uniforms = {
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uMap: { value: texture },
      uSize: { value: new Vector2(sizeX, sizeY) },
      uHeight: { value: height },
      uBaseY: { value: baseY },
      uFall: { value: fall },
      uSway: { value: sway },
      uSpin: { value: spin },
      uTint: { value: new Color(tint) },
      uGlow: { value: glow },
    }
    const material = createFogMaterial({
      vertexShader: FLUTTER_VERT,
      fragmentShader: FLUTTER_FRAG,
      uniforms,
      transparent: true,
      side: DoubleSide,
    })
    return { geometry, material, uniforms }
  }, [texture, count, radius, height, baseY, innerRadius, sizeX, sizeY, fall, sway, spin, tint, glow, seed])

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

  if (count <= 0) return null
  return <instancedMesh args={[built.geometry, built.material, count]} frustumCulled={false} renderOrder={5} />
}
