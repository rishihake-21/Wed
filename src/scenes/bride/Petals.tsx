import { useMemo } from 'react';
import { Color } from 'three';
import type { QualityTier, Vec3 } from '../../core/types';
import { Drifters } from '../../shared/Drifters';
import { colors } from '../../theme/tokens';
import { budgetFor, POND_SCALE } from './config';

/** Scene-local box the petals drift through: the part of the pond the camera sees, up to head height of a 6 m figure. */
const BOX: readonly [Vec3, Vec3] = [
  [-34, 0.4, -42],
  [22, 11, 12],
];

const SIZE = [0.16 * POND_SCALE, 0.3 * POND_SCALE] as const;
const WIND = [0.22 * POND_SCALE * 0.6, -0.1 * POND_SCALE * 0.6] as const;
const FALL = 0.32 * POND_SCALE * 0.6;

/** A lotus petal: a teardrop that is cream at its base and pink at its tip, brighter when it turns toward the viewer. */
const PETAL_SHADE = /* glsl */ `
  uniform vec3 uPetalBase;
  uniform vec3 uPetalTip;
  vec4 drifterShade(vec2 uv, float seed, float facing) {
    float y = uv.y;
    float x = (uv.x - 0.5) * 2.0;
    float w = sin(pow(clamp(y, 0.0, 1.0), 0.7) * 3.1416) * 0.92;
    float shape = smoothstep(w, w - 0.18, abs(x)) * smoothstep(0.0, 0.06, y) * smoothstep(1.0, 0.9, y);
    vec3 col = mix(uPetalBase, uPetalTip, smoothstep(0.05, 0.85, y));
    col = mix(col, uPetalBase, seed * 0.35);
    col *= 0.45 + 0.55 * facing;
    return vec4(col, shape * 0.92);
  }
`;

/** Lotus petals drifting down through the scene on a faint breeze. Sized to the figure, so they read at its distance. */
export function Petals({ quality, fade }: { quality: QualityTier; fade: { value: number } }) {
  const uniforms = useMemo(
    () => ({
      uPetalBase: { value: new Color(colors.cream) },
      uPetalTip: { value: new Color(colors.lotus) },
    }),
    [],
  );
  const budget = budgetFor(quality);
  return (
    <Drifters
      quality={quality}
      count={{ high: budget.petals, medium: budget.petals, low: budget.petals }}
      box={BOX}
      size={SIZE}
      shade={PETAL_SHADE}
      uniforms={uniforms}
      fall={FALL}
      wind={WIND}
      seed={5}
      fade={fade}
    />
  );
}
