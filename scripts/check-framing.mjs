// Guards the camera framing: the numbered placeholder rooms must stay in view on phones, the
// camera must turn gently in Part A, and it must never clip a room. Needs Node 22.6+; no install.
//   npm run check
//
// The camera spline is re-implemented in scripts/lib/spline.mjs so this can run without three
// installed; everything else (waypoints, origins, ranges, gaze weight, field of view) is imported
// from src/core/layout.ts.
import assert from 'node:assert/strict';
import * as L from '../src/core/layout.ts';
import { basis, dot, halfFovTangents, pose, SCREENS, sub } from './lib/spline.mjs';

// Placeholder box (PlaceholderScene.tsx): 3 × 3 × 3, centred 1.5 above the scene origin, spinning
const BOX_Y = 1.5, BOX_HALF_DIAGONAL = 1.5 * Math.SQRT2;
const MIN_VISIBLE_PERCENT = 25; // every scene, every screen: the box is in view this much of its scroll
const MAX_PART_A_YAW = 30; // deg/s during the auto-played opening ("slow cinematic camera")
const MIN_CLEARANCE = 1.0; // world units between the camera and the box's bounding circle

const N = 500;
console.log('Box in view, % of each scene (scene 1 … 9):');
for (const [name, aspect] of SCREENS) {
  const { tanV, tanH } = halfFovTangents(aspect);
  const row = [];
  for (let i = 0; i < L.SCENE_COUNT; i++) {
    const [s, e] = L.SCENE_RANGES[i];
    let visible = 0;
    for (let k = 0; k < N; k++) {
      const ps = pose(s + ((e - s) * (k + 0.5)) / N);
      const { f, r, u } = basis(ps);
      const v = sub([L.SCENE_ORIGINS[i][0], BOX_Y, L.SCENE_ORIGINS[i][2]], ps.pos);
      const z = dot(v, f);
      if (z > 0.1 && Math.abs(dot(v, r)) <= z * tanH && Math.abs(dot(v, u)) <= z * tanV) visible++;
    }
    row.push((100 * visible) / N);
  }
  console.log(`  ${name.padEnd(16)} ${row.map((v) => v.toFixed(0).padStart(3)).join(' ')}   (min ${Math.min(...row).toFixed(0)}%)`);
  assert.ok(Math.min(...row) >= MIN_VISIBLE_PERCENT, `${name}: a placeholder box is in view less than ${MIN_VISIBLE_PERCENT}% of its scene`);
}

// Turn rate during Part A (t advances at PART_A_END_T over PART_A_DURATION_S seconds)
const partARate = L.PART_A_END_T / L.PART_A_DURATION_S;
const STEPS = 4000;
let prevYaw = null, maxYaw = 0;
for (let k = 0; k <= STEPS; k++) {
  const t = (k / STEPS) * L.PART_A_END_T;
  const { f } = basis(pose(t));
  const yaw = (Math.atan2(f[0], -f[2]) * 180) / Math.PI;
  if (prevYaw !== null) maxYaw = Math.max(maxYaw, (Math.abs(yaw - prevYaw) * STEPS / L.PART_A_END_T) * partARate);
  prevYaw = yaw;
}
console.log(`Part A max turn rate: ${maxYaw.toFixed(1)} deg/s (limit ${MAX_PART_A_YAW})`);
assert.ok(maxYaw <= MAX_PART_A_YAW, `Part A turns too fast: ${maxYaw.toFixed(1)} deg/s`);

// Clearance: the camera never passes through a room's box
let clearance = Infinity;
for (let i = 0; i < L.SCENE_COUNT; i++) {
  const [s, e] = L.SCENE_RANGES[i];
  for (let k = 0; k < N; k++) {
    const ps = pose(s + ((e - s) * (k + 0.5)) / N);
    if (ps.pos[1] < -0.5 || ps.pos[1] > 3.5) continue;
    const d = Math.hypot(L.SCENE_ORIGINS[i][0] - ps.pos[0], L.SCENE_ORIGINS[i][2] - ps.pos[2]) - BOX_HALF_DIAGONAL;
    clearance = Math.min(clearance, d);
  }
}
console.log(`Closest the camera gets to a box: ${clearance.toFixed(1)} units (minimum ${MIN_CLEARANCE})`);
assert.ok(clearance >= MIN_CLEARANCE, `camera passes too close to a box: ${clearance.toFixed(2)}`);

console.log('framing checks passed');
