/**
 * Reusable GLSL snippets. Concatenate into a ShaderMaterial's source, e.g.
 *   fragmentShader: `${GLSL_NOISE} void main() { ... }`
 */

/** hash11, hash21 and a smooth value noise, noise21(vec2) in 0–1. */
export const GLSL_NOISE = /* glsl */ `
float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}
float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float noise21(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
             mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
}
`;

/**
 * Expands one corner of a unit quad (corner in -0.5..0.5) around `center` (model space),
 * so the quad always faces the camera. Returns the clip-space position and writes the
 * view-space distance to `dist`.
 */
export const GLSL_BILLBOARD = /* glsl */ `
vec4 billboardClip(vec3 center, vec2 corner, vec2 size, out float dist) {
  vec4 mv = modelViewMatrix * vec4(center, 1.0);
  dist = -mv.z;
  mv.xy += corner * size;
  return projectionMatrix * mv;
}
`;
