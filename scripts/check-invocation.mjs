// Guards scene 1 (Invocation): the scene dissolves before it unmounts, the moon stays in frame, and
// no diya passes close enough to the camera to fill the lens. Needs Node 22.6+; no install.
//   npm run check
//
// Everything here is pure TypeScript from src/: the fade, the moon's direction and the diya layout.
// The camera spline is the re-implementation in scripts/lib/spline.mjs.
import assert from 'node:assert/strict';
import * as L from '../src/core/layout';
import { DIYA_COUNT, DIYA_SCENE_SECONDS, DIYA_SWAY, diyaLayout } from '../src/scenes/invocation/diyaLayout';
import { MOON_DIRECTION_XYZ } from '../src/shared/moon';
import { FADE_OUT_START, sceneFade } from '../src/shared/sceneFade';
import { basis, dot, halfFovTangents, norm, pose, SCREENS } from './lib/spline.mjs';

const [S, E] = L.SCENE_RANGES[0];
const tAt = (progress) => S + (E - S) * progress;
const ORIGIN = L.SCENE_ORIGINS[0];

// --- The scene dissolves before it unmounts: SceneManager drops scene 1 the moment scene 2 is active.
assert.equal(sceneFade(0), 1);
assert.equal(sceneFade(FADE_OUT_START), 1);
assert.equal(sceneFade(1), 0, 'scene 1 must be fully faded at the end of its progress, or it pops out when it unmounts');
let previous = 1;
for (let i = 0; i <= 200; i++) {
  const f = sceneFade(i / 200);
  assert.ok(f <= previous + 1e-12 && f >= 0 && f <= 1, `sceneFade is not a monotone 1 → 0 ramp at ${i / 200}`);
  previous = f;
}
console.log(`fade: full until progress ${FADE_OUT_START}, zero at 1`);

// --- The moon stays in frame for most of the scene on every screen shape (margin: 6% of the half-frame).
const MIN_MOON_PERCENT = 60;
const moon = norm([...MOON_DIRECTION_XYZ]);
console.log('Moon in frame, % of scene 1:');
for (const [name, aspect] of SCREENS) {
  const { tanV, tanH } = halfFovTangents(aspect);
  let inFrame = 0;
  const N = 400;
  for (let k = 0; k < N; k++) {
    const { f, r, u } = basis(pose(tAt(k / N)));
    const z = dot(moon, f);
    if (z > 0.05 && Math.abs(dot(moon, r) / (z * tanH)) < 0.94 && Math.abs(dot(moon, u) / (z * tanV)) < 0.94) inFrame++;
  }
  const percent = (100 * inFrame) / N;
  console.log(`  ${name.padEnd(16)} ${percent.toFixed(0)}%`);
  assert.ok(percent >= MIN_MOON_PERCENT, `${name}: the moon is in frame only ${percent.toFixed(0)}% of scene 1 (minimum ${MIN_MOON_PERCENT}%)`);
}

// --- Diyas: deterministic, and none passes close to the real camera path.
const MIN_TRUE_CLEARANCE = 1.8; // metres, 3D, from the camera to the middle of a diya's bowl
const DIYA_BOWL_Y = 0.03;
console.log('Closest a diya gets to the camera (3D, metres), by tier:');
for (const [tier, count] of Object.entries(DIYA_COUNT)) {
  const a = diyaLayout(count);
  const b = diyaLayout(count);
  assert.deepEqual(a.base, b.base, `${tier}: the layout must be the same every run`);
  assert.ok([...a.base, ...a.misc].every(Number.isFinite), `${tier}: layout has a non-finite value`);

  let closest = Infinity;
  let worst = '';
  for (let i = 0; i < count; i++) {
    const [bx, , bz] = a.base.slice(i * 3, i * 3 + 3);
    const speed = a.misc[i * 3 + 1];
    for (let k = 0; k <= 400; k++) {
      const progress = k / 400;
      const { pos } = pose(tAt(progress));
      for (const sway of [-DIYA_SWAY, 0, DIYA_SWAY]) {
        const d = Math.hypot(bx + sway + ORIGIN[0] - pos[0], DIYA_BOWL_Y - pos[1], bz + DIYA_SCENE_SECONDS * progress * speed + ORIGIN[2] - pos[2]);
        if (d < closest) {
          closest = d;
          worst = `diya ${i} at progress ${progress.toFixed(2)}`;
        }
      }
    }
  }
  console.log(`  ${tier.padEnd(6)} ${closest.toFixed(2)} m (${worst})`);
  assert.ok(closest >= MIN_TRUE_CLEARANCE, `${tier}: ${worst} passes ${closest.toFixed(2)} m from the camera (minimum ${MIN_TRUE_CLEARANCE})`);
}

// --- The hero cluster is where the camera looks: several diyas in frame together on a phone at some point.
{
  const { tanV, tanH } = halfFovTangents(390 / 844);
  const { base, misc } = diyaLayout(DIYA_COUNT.medium);
  let most = 0;
  for (let k = 0; k <= 200; k++) {
    const progress = k / 200;
    const ps = pose(tAt(progress));
    const { f, r, u } = basis(ps);
    let visible = 0;
    for (let i = 0; i < DIYA_COUNT.medium; i++) {
      const w = [base[i * 3] + ORIGIN[0] - ps.pos[0], 0.3 - ps.pos[1], base[i * 3 + 2] + DIYA_SCENE_SECONDS * progress * misc[i * 3 + 1] + ORIGIN[2] - ps.pos[2]];
      const z = dot(w, f);
      if (z > 2 && Math.abs(dot(w, r)) < z * tanH && Math.abs(dot(w, u)) < z * tanV) visible++;
    }
    most = Math.max(most, visible);
  }
  console.log(`Most medium-tier diyas in a phone frame at once: ${most}`);
  assert.ok(most >= 6, `only ${most} diyas are ever in view together on a phone; the hero cluster is out of the camera's gaze`);
}

console.log('invocation checks passed');
