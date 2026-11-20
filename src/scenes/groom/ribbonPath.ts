/**
 * Control points of the flute ribbon, in the figure's own space (the figure stands centred on the
 * origin, 4.6 units tall; see config.ts FIGURE_HEIGHT). Pure, so `npm run check` can keep the
 * ribbon clear of the camera. From the flute's end it spirals up and around the figure, about
 * 1.7 turns: behind the figure first, then around the front above the head.
 */
export function ribbonPoints(): Array<[number, number, number]> {
  const points: Array<[number, number, number]> = []
  const n = 14
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const a = -t * Math.PI * 3.4
    const r = 1 + t * 2.4
    points.push([Math.cos(a) * r * 1.1, 1.27 + t * 3.1 + Math.sin(t * 10) * 0.18, Math.sin(a) * r])
  }
  return points
}
