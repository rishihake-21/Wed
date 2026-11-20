import { HERO_HEIGHT } from '../../core/layout'
import { byTier } from '../../shared/tier'
import type { PerTier } from '../../shared/tier'
import { smoothstep } from '../../shared/math'
import type { QualityTier } from '../../core/types'

/** Figure height in the room's own units. The room is authored around the middle of the figure. */
export const FIGURE_HEIGHT = 4.6
export const GROUND_Y = -FIGURE_HEIGHT / 2

/**
 * One knob for the whole room: the room is authored at the size above and scaled so the figure
 * stands HERO_HEIGHT (core/layout.ts) tall in the world, which is what the camera's gaze and the
 * framing guard are tuned for. Open the page with ?groomDebug to see the axes, a ground grid and
 * the grove radius.
 */
export const GROOM_SCALE = HERO_HEIGHT / FIGURE_HEIGHT

/** Trees stand between these two radii; the middle is the clearing around the hero. */
export const GROVE_INNER = 7.5
export const GROVE_OUTER = 19

/** Half-width (radians) of the sector kept free of trees, facing where the camera arrives from. */
export const CLEARING_HALF_ANGLE = 0.95

/** 0 = the figure keeps the arrival direction, 1 = it always squarely faces the camera. */
export const FACE_CAMERA = 0.6

export interface GroomBudget {
  trees: number
  clustersPerTree: number
  flowersPerTree: number
  grass: number
  feathers: number
  ribbonSegments: number
  sparkles: number
  /** Icosphere subdivisions for canopy clusters. */
  detail: number
  /** Width in px of the canvas textures (height is derived). */
  texture: number
}

const BUDGETS: PerTier<GroomBudget> = {
  high: { trees: 26, clustersPerTree: 7, flowersPerTree: 14, grass: 1800, feathers: 34, ribbonSegments: 160, sparkles: 28, detail: 2, texture: 256 },
  medium: { trees: 16, clustersPerTree: 5, flowersPerTree: 10, grass: 800, feathers: 22, ribbonSegments: 110, sparkles: 18, detail: 2, texture: 256 },
  low: { trees: 10, clustersPerTree: 4, flowersPerTree: 6, grass: 350, feathers: 12, ribbonSegments: 70, sparkles: 10, detail: 1, texture: 128 },
}

/** Counts for a quality tier. Lite never gets here: the scene draws nothing at lite (the sky is the scene). */
export function budgetFor(quality: QualityTier): GroomBudget {
  return byTier(quality, BUDGETS)
}

/**
 * When each 3D element appears, as a function of the scene's local progress (0..1). The camera
 * holds its gaze on the groom from 0.2 to 0.68 and sweeps past him from about 0.8, so he arrives
 * early, small and far away, and is dissolved before the lens reaches him. The name reveal is HTML
 * (ui/overlays/PersonOverlays.tsx) and reads its own timing.
 */
export const REVEAL = {
  /** Feathers, glow and the ribbon fade in at the start and out at the end, so the room never pops. */
  ambient: (p: number): number => smoothstep(0, 0.14, p) * (1 - smoothstep(0.93, 1, p)),
  figure: (p: number): number => smoothstep(0.08, 0.34, p) * (1 - smoothstep(0.76, 0.88, p)),
  /** How far along its length the flute ribbon has been drawn (0..1). */
  ribbon: (p: number): number => smoothstep(0.05, 0.62, p),
} as const
