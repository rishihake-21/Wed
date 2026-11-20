import type { CanvasTexture } from 'three'
import { shade, withAlpha } from '../../shared/colour'
import { canvasTexture } from '../../shared/textures'
import { colors } from '../../theme/tokens'

/** The figure's paint, from the theme tokens: gilded edge, indigo body, marigold-gold halo. */
const EDGE = withAlpha(shade(colors.gold, colors.cream, 0.45), 0.92)
const BODY_TOP = shade(colors.midnight, colors.yamuna, 0.4)
const BODY_BOTTOM = shade(colors.midnight, '#000000', 0.4)
const HALO = shade(colors.gold, colors.marigold, 0.3)
const HALO_SOFT = withAlpha(HALO, 0.9)

/*
 * Placeholder cut-out for the groom: a stylised figure in a pheta (turban), playing a bansuri, with a
 * small peacock feather tucked in. It is drawn from SVG path data on a 200 x 400 grid, so it needs no
 * image file. Phase 10 swaps it for the real illustration: replace makeFigureTextures() with two
 * TextureLoader textures (fill + glow) and nothing else changes.
 */

export interface Part {
  kind: 'fill' | 'stroke'
  d: string
  /** Stroke width in grid units (stroke parts only). */
  width?: number
}

export const GROOM_PARTS: Part[] = [
  // angavastra (shoulder cloth) flowing behind
  { kind: 'fill', d: 'M 62 124 C 40 160 34 220 40 292 C 44 300 54 300 56 290 C 54 220 60 170 78 130 Z' },
  // dhoti
  { kind: 'fill', d: 'M 70 196 L 142 196 C 152 250 160 310 164 372 L 48 372 C 52 310 60 250 70 196 Z' },
  // feet
  { kind: 'fill', d: 'M 58 380 a 16 7 0 1 0 32 0 a 16 7 0 1 0 -32 0 Z' },
  { kind: 'fill', d: 'M 122 380 a 16 7 0 1 0 32 0 a 16 7 0 1 0 -32 0 Z' },
  // torso and neck
  { kind: 'fill', d: 'M 62 124 C 62 116 76 112 94 118 L 118 118 C 136 112 152 116 152 126 L 144 200 L 70 200 Z' },
  { kind: 'fill', d: 'M 96 100 L 116 100 L 118 120 L 94 120 Z' },
  // head, with a nose and chin turned toward the flute
  { kind: 'fill', d: 'M 86 80 C 86 60 96 52 108 52 C 122 52 128 64 128 78 L 134 86 L 126 90 C 126 100 118 106 108 106 C 94 106 86 96 86 80 Z' },
  // pheta, its tail and top knot
  { kind: 'fill', d: 'M 70 52 C 70 28 88 14 106 14 C 126 14 140 28 140 50 C 140 60 136 66 130 68 L 80 68 C 74 66 70 60 70 52 Z' },
  { kind: 'fill', d: 'M 74 46 C 56 44 40 52 32 72 C 44 66 58 64 76 66 Z' },
  { kind: 'fill', d: 'M 100 14 C 100 6 112 4 114 14 Z' },
  // arms, both hands on the flute
  { kind: 'stroke', width: 13, d: 'M 68 128 L 52 170 L 120 100' },
  { kind: 'stroke', width: 13, d: 'M 146 128 L 176 160 L 160 100' },
  // the bansuri
  { kind: 'stroke', width: 5, d: 'M 116 96 L 198 90' },
  // a small peacock feather tucked into the pheta
  { kind: 'stroke', width: 2.5, d: 'M 134 26 C 142 10 154 4 164 6' },
  { kind: 'fill', d: 'M 158 6 a 6 9 -30 1 0 12 0 a 6 9 -30 1 0 -12 0 Z' },
]

const GRID_W = 200
const GRID_H = 400

/** Fraction of the canvas left empty on every side, so the glow has room to fade out. */
export const FIGURE_PAD = 0.1

function paint(ctx: CanvasRenderingContext2D, part: Part, outline = 0): void {
  const path = new Path2D(part.d)
  if (part.kind === 'stroke') {
    ctx.lineWidth = (part.width ?? 6) + outline
    ctx.stroke(path)
  } else if (outline > 0) {
    ctx.lineWidth = outline
    ctx.stroke(path)
  } else {
    ctx.fill(path)
  }
}

function fitGrid(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.translate(w * FIGURE_PAD, h * FIGURE_PAD)
  ctx.scale((w * (1 - 2 * FIGURE_PAD)) / GRID_W, (h * (1 - 2 * FIGURE_PAD)) / GRID_H)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
}

/**
 * fill: a dark indigo body with a thin gilded edge (a gold outline is drawn first, then the body covers
 *       its inner half, so only the outer silhouette keeps the gold).
 * rim:  the same shape as a soft golden halo with the shape itself cut out, drawn on a plane behind the
 *       figure so the two layers drift apart slightly as the camera moves.
 */
export function makeFigureTextures(width: number): { fill: CanvasTexture; rim: CanvasTexture } {
  const height = width * 2

  const fill = canvasTexture(width, height, (ctx, w, h) => {
    fitGrid(ctx, w, h)
    ctx.strokeStyle = EDGE
    for (const part of GROOM_PARTS) paint(ctx, part, 3.4)
    const body = ctx.createLinearGradient(0, 0, 0, GRID_H)
    body.addColorStop(0, BODY_TOP)
    body.addColorStop(1, BODY_BOTTOM)
    ctx.fillStyle = body
    ctx.strokeStyle = body
    for (const part of GROOM_PARTS) paint(ctx, part)
  })

  const rim = canvasTexture(width, height, (ctx, w, h) => {
    fitGrid(ctx, w, h)
    ctx.shadowColor = HALO
    ctx.shadowBlur = w * 0.07
    ctx.fillStyle = HALO_SOFT
    ctx.strokeStyle = HALO_SOFT
    for (const part of GROOM_PARTS) paint(ctx, part)
    // cut the shape itself out, keeping only the glow around it
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillStyle = '#000'
    ctx.strokeStyle = '#000'
    for (const part of GROOM_PARTS) paint(ctx, part)
  })

  return { fill, rim }
}
