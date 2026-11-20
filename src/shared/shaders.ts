import {
  AdditiveBlending,
  FrontSide,
  NormalBlending,
  REVISION,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
} from 'three'
import type { IUniform, Side } from 'three'

/**
 * Shared GLSL building blocks so every custom material honours the scene fog.
 * CLAUDE.md: the fog far plane equals SEGMENT_LENGTH, so the next room is fully fogged when it mounts.
 * A material that ignores fog would pop in, so every ShaderMaterial in a scene is built with createFogMaterial.
 */

/** three renamed the output colour-space chunk in r154. */
const COLORSPACE_CHUNK = parseInt(REVISION, 10) >= 154 ? 'colorspace_fragment' : 'encodings_fragment'

/** Vertex shader: on its own line, before `main`. */
export const VERT_HEAD = /* glsl */ `#include <fog_pars_vertex>`

/** Vertex shader: last line of `main`, after `vec4 mvPosition` is final. */
export const VERT_FOG = /* glsl */ `#include <fog_vertex>`

/** Fragment shader (opaque or alpha-blended): declarations, before `main`. */
export const FRAG_HEAD = /* glsl */ `#include <fog_pars_fragment>`

/** Fragment shader (opaque or alpha-blended): last lines of `main`, after gl_FragColor is set. */
export const FRAG_FOG = /* glsl */ `
#include <tonemapping_fragment>
#include <${COLORSPACE_CHUNK}>
#include <fog_fragment>
`

/**
 * For solid (opaque) surfaces of a scene that has to dissolve before it unmounts (CLAUDE.md: a scene
 * unmounts the moment the next becomes active, so whatever is still in view would pop out). Declare
 * with FRAG_HEAD_FADE, finish with FRAG_FOG_FADE, and give the material a `fade` uniform box
 * (createFogMaterial's `fade` option) that the scene sets from sceneFade(progress) every frame.
 * The surface dissolves into the fog colour, which is the colour of the empty space behind it.
 */
export const FRAG_HEAD_FADE = /* glsl */ `
#include <fog_pars_fragment>
uniform float uFade;
`

export const FRAG_FOG_FADE = /* glsl */ `
#include <tonemapping_fragment>
#include <${COLORSPACE_CHUNK}>
#include <fog_fragment>
#ifdef USE_FOG
  gl_FragColor.rgb = mix(fogColor, gl_FragColor.rgb, uFade);
#endif
`

/**
 * Additive materials must fade out with distance; mixing toward the fog colour would brighten them.
 * Multiply alpha by fogFade(), then finish with FRAG_END_ADD.
 */
export const FRAG_HEAD_ADD = /* glsl */ `
#include <fog_pars_fragment>
float fogFade() {
#ifdef USE_FOG
  #ifdef FOG_EXP2
    return exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
  #else
    return 1.0 - smoothstep(fogNear, fogFar, vFogDepth);
  #endif
#else
  return 1.0;
#endif
}
`

/**
 * Fragment shader (additive): last lines of `main`, after gl_FragColor is set. Deliberately leaves out
 * tone mapping and colour-space encoding, like the other glow layers (stars, flames, fireflies, mist;
 * CLAUDE.md): on the composer path PostFX does both once for the whole frame, and the low tier writes
 * a glow layer as it is, so every glow in the film looks the same on every tier.
 */
export const FRAG_END_ADD = ''

/**
 * Cheap 3D hash + value noise (GLSL ES 1.00 / 3.00 safe). Include in the stage that uses it.
 * (shared/glsl.ts has the 2D set, GLSL_NOISE; the function names differ, so both can be included.)
 */
export const GLSL_NOISE_3D = /* glsl */ `
float hash31(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}
float vnoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash31(i);
  float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash31(i + vec3(1.0, 1.0, 1.0));
  return mix(
    mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
    mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
    f.z
  );
}
`

export interface FogMaterialOptions {
  vertexShader: string
  fragmentShader: string
  uniforms: Record<string, IUniform>
  transparent?: boolean
  additive?: boolean
  depthWrite?: boolean
  side?: Side
  /** Pull the surface slightly toward the camera (avoids z-fighting with a floor at the same height). */
  polygonOffset?: boolean
  /** One shared box for `uFade`: the scene writes sceneFade(progress) into it once per frame. */
  fade?: { value: number }
}

export function createFogMaterial(o: FogMaterialOptions): ShaderMaterial {
  const transparent = o.transparent ?? false
  return new ShaderMaterial({
    vertexShader: o.vertexShader,
    fragmentShader: o.fragmentShader,
    uniforms: { ...UniformsUtils.clone(UniformsLib.fog), ...o.uniforms, ...(o.fade ? { uFade: o.fade } : {}) },
    fog: true,
    transparent,
    depthWrite: o.depthWrite ?? !transparent,
    blending: o.additive ? AdditiveBlending : NormalBlending,
    side: o.side ?? FrontSide,
    polygonOffset: o.polygonOffset ?? false,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  })
}
