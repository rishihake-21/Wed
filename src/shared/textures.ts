import { CanvasTexture, SRGBColorSpace } from 'three'
import { colors } from '../theme/tokens'
import { shade, withAlpha } from './colour'
import { createRng } from './math'

/**
 * Draws into a 2D canvas and wraps it as a texture.
 * CLAUDE.md: textures made by hand are disposed by the owner on unmount (texture.dispose()).
 */
export function canvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (ctx) draw(ctx, width, height)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

/**
 * A peacock "eye" feather on a transparent background: a shaft, fine barbs that widen toward the eye,
 * and concentric gold, green, teal and indigo rings. The tip is at the top of the canvas.
 */
export function makeFeatherTexture(width = 128, height = 256): CanvasTexture {
  return canvasTexture(width, height, (ctx, w, h) => {
    const rng = createRng(7)
    const cx = w / 2
    const tip = h * 0.04
    const tail = h * 0.97
    const eyeY = h * 0.3
    const eyeRx = w * 0.2
    const eyeRy = h * 0.1
    ctx.lineCap = 'round'

    // Barbs: strokes fanning out from the shaft. The widest part sits around the eye.
    const barbs = Math.round(h * 1.1)
    for (let i = 0; i < barbs; i++) {
      const s = i / (barbs - 1) // 0 = tail, 1 = tip
      const y = tail - s * (tail - tip)
      const reach = w * 0.46 * Math.pow(Math.sin(Math.PI * Math.pow(s, 1.8)), 0.7)
      if (reach < 0.8) continue
      const hue = 50 + s * 125 // olive-gold at the tail, green, then teal at the eye
      ctx.strokeStyle = `hsla(${hue + (rng() - 0.5) * 18}, 62%, ${28 + rng() * 22}%, 0.88)`
      ctx.lineWidth = 1 + rng() * 0.7
      for (const side of [-1, 1]) {
        const len = reach * (0.78 + rng() * 0.22)
        ctx.beginPath()
        ctx.moveTo(cx, y)
        ctx.lineTo(cx + side * len, y - len * 0.42)
        ctx.stroke()
      }
    }

    // Shaft
    ctx.strokeStyle = withAlpha(shade(colors.gold, colors.cream, 0.25), 0.95)
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(cx, tail)
    ctx.lineTo(cx, tip + h * 0.04)
    ctx.stroke()

    // The eye
    const rings: Array<[string, number]> = [
      [shade(colors.gold, colors.midnight, 0.2), 1],
      [colors.peacock, 0.82],
      [colors.yamuna, 0.66],
      [shade(colors.midnight, colors.yamuna, 0.3), 0.48],
      [colors.midnight, 0.28],
    ]
    for (const [color, k] of rings) {
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.ellipse(cx, eyeY, eyeRx * k, eyeRy * k, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = withAlpha(shade(colors.yamuna, colors.cream, 0.55), 0.85)
    ctx.beginPath()
    ctx.ellipse(cx - eyeRx * 0.08, eyeY - eyeRy * 0.12, eyeRx * 0.1, eyeRy * 0.13, 0, 0, Math.PI * 2)
    ctx.fill()
  })
}
