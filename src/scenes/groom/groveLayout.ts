/**
 * Where the kadamba trees, their canopy clusters and flowers go, in the room's own units (around the
 * middle of the figure, before the room is scaled). Pure (no three.js): `npm run check` tests it
 * against the real camera spline, and Grove.tsx only turns it into instance matrices.
 *
 * Trees ring the clearing. The sector facing ARRIVAL_YAW (where the camera comes from) stays open so
 * the hero is never blocked, the tallest tree stands straight behind the hero, and no trunk is
 * planted within TRUNK_CLEARANCE metres of the camera's path.
 */
import { distanceToCameraLine } from '../../shared/cameraLine'
import { angleDelta, createRng } from '../../shared/math'
import { CLEARING_HALF_ANGLE, GROOM_SCALE, GROUND_Y, GROVE_INNER, GROVE_OUTER } from './config'
import type { GroomBudget } from './config'
import { ARRIVAL_YAW, GROOM_SCENE, roomToScene } from './stage'

/** World metres between a trunk's surface and the camera's line. */
export const TRUNK_CLEARANCE = 3.2

export interface Tree {
  x: number
  z: number
  h: number
  r: number
  hero: boolean
  lean: number
  yaw: number
  seed: number
}

/** One clump of leaves: an ellipsoid (sx, sy, sz are its semi-axes) with a tint for variety. */
export interface Cluster {
  x: number
  y: number
  z: number
  sx: number
  sy: number
  sz: number
  yaw: number
  seed: number
  tint: readonly [number, number, number]
}

export interface Blossom {
  x: number
  y: number
  z: number
  size: number
  seed: number
}

export interface GroveLayout {
  trees: Tree[]
  clusters: Cluster[]
  blossoms: Blossom[]
}

export type GroveBudget = Pick<GroomBudget, 'trees' | 'clustersPerTree' | 'flowersPerTree'>

export function groveLayout(b: GroveBudget, yaw: number = ARRIVAL_YAW): GroveLayout {
  const rng = createRng(2406)
  const planted: Array<Pick<Tree, 'x' | 'z' | 'h' | 'r' | 'hero'>> = []
  const back = yaw + Math.PI
  planted.push({ x: Math.sin(back) * 4.4, z: Math.cos(back) * 4.4, h: 11.5, r: 1.3, hero: true })

  for (let tries = 0; planted.length < b.trees && tries < 800; tries++) {
    const a = rng() * Math.PI * 2
    if (Math.abs(angleDelta(yaw, a)) < CLEARING_HALF_ANGLE) continue
    const dist = GROVE_INNER + Math.pow(rng(), 0.85) * (GROVE_OUTER - GROVE_INNER)
    const x = Math.sin(a) * dist
    const z = Math.cos(a) * dist
    if (planted.some((t) => (t.x - x) ** 2 + (t.z - z) ** 2 < 10)) continue
    const h = 5.5 + rng() * 3.8
    const r = 0.5 + rng() * 0.3
    const [sx, sz] = roomToScene(x, z)
    if (distanceToCameraLine(GROOM_SCENE, sx, sz) < TRUNK_CLEARANCE + r * GROOM_SCALE) continue
    planted.push({ x, z, h, r, hero: false })
  }

  const perTree = b.clustersPerTree
  const trees: Tree[] = []
  const clusters: Cluster[] = []
  const blossoms: Blossom[] = []

  planted.forEach((t) => {
    trees.push({ ...t, lean: (rng() - 0.5) * 0.12, yaw: rng() * Math.PI * 2, seed: rng() })

    const count = t.hero ? perTree + 4 : perTree
    const hosts: Cluster[] = []
    for (let c = 0; c < count; c++) {
      const s = (t.hero ? 2.6 : 1.55) * (0.8 + rng() * 0.55)
      const spread = t.hero ? 3.2 : 1.9
      const x = t.x + (rng() - 0.5) * spread * 1.6
      const z = t.z + (rng() - 0.5) * spread * 1.6
      const y = GROUND_Y + t.h * (0.74 + rng() * 0.26) + (t.hero ? 0.6 : 0)
      const seed = rng()
      const cluster: Cluster = {
        x, y, z, sx: s * 1.15, sy: s * 0.78, sz: s * 1.15, yaw: rng() * Math.PI * 2, seed,
        tint: [rng(), rng(), rng()],
      }
      clusters.push(cluster)
      hosts.push(cluster)
    }

    // Kadamba flowers: small golden spheres sitting on the canopy surface.
    for (let f = 0; f < b.flowersPerTree; f++) {
      const host = hosts[Math.floor(rng() * hosts.length)]
      if (!host) continue
      const u = rng() * 2 - 1
      const th = rng() * Math.PI * 2
      const ring = Math.sqrt(1 - u * u)
      const dx = ring * Math.cos(th)
      const dy = Math.abs(u) * 0.9 + 0.05
      const dz = ring * Math.sin(th)
      blossoms.push({
        x: host.x + dx * host.sx * 1.04,
        y: host.y + dy * host.sy * 1.04,
        z: host.z + dz * host.sz * 1.04,
        size: 0.13 + rng() * 0.1,
        seed: host.seed,
      })
    }
  })

  return { trees, clusters, blossoms }
}
