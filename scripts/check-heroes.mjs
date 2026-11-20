// Guards the hero scenes (2: groom, 3: bride) against the real camera spline, the same way
// check-invocation.mjs guards scene 1:
//   - the hero stays centred and big enough on every screen while the name reveals, and the
//     overlay's name block sits below the hero's feet on a phone;
//   - the camera never passes closer than MIN_* to the hero, a trunk, a canopy cluster or the ribbon.
// Needs Node 22.6+; no install. Run through `npm run check`.
import assert from 'node:assert/strict';
import * as L from '../src/core/layout.ts';
import { PERSON_TIMING as T } from '../src/ui/overlays/personTiming.ts';
import { FACE_CAMERA, GROOM_SCALE, REVEAL, budgetFor } from '../src/scenes/groom/config.ts';
import { groveLayout } from '../src/scenes/groom/groveLayout.ts';
import { ribbonPoints } from '../src/scenes/groom/ribbonPath.ts';
import { ARRIVAL_YAW, GROOM_POSITION, GROOM_SPOT, roomToScene } from '../src/scenes/groom/stage.ts';
import { lerpAngle, smoothstep } from '../src/shared/math.ts';
import { BUDGETS as BRIDE_BUDGETS, POND_SCALE, TIMING as BRIDE_TIMING, ambient as brideAmbient } from '../src/scenes/bride/config.ts';
import { LOTUS_HEIGHT, LOTUS_REACH, NEAREST_Z, pondLayout } from '../src/scenes/bride/pondLayout.ts';
import { RIBBON_WIDTH, ribbonPoints as brideRibbonPoints } from '../src/scenes/bride/ribbonPath.ts';
import { BRIDE_SCENE, BRIDE_SPOT, POND_CENTRE, POND_RADIUS } from '../src/scenes/bride/stage.ts';
import { basis, dot, halfFovTangents, len, makeCurve, pose, SCREENS, sub } from './lib/spline.mjs';

const PHONE = 0; // SCREENS[0]: 390x844
const WINDOW = [0.2, 0.7]; // the camera holds its gaze on the hero over [0.2, 0.68]
const MIN_HERO_DISTANCE = 3.3; // metres from the camera to the middle of the figure
const MIN_SOLID_CLEARANCE = 1.8; // trunks and canopy clusters
const MIN_RIBBON_CLEARANCE = 1.5; // the ribbon is thin and glows, but must not cross the lens
// Figure height as a share of the screen, anywhere in WINDOW. He is smallest (about 16.6% on a phone)
// where the hold begins, far off and only just fading in; he grows to about 28% by the name reveal.
const MIN_PHONE_HEIGHT = 0.16;
const MIN_PHONE_HEIGHT_AT_NAME = 0.25; // ... and at p = 0.5, when the name is revealed
const MIN_LOTUS_CLEARANCE = 1.8; // metres from the camera to a lotus's cylinder
const MIN_BRIDE_RIBBON_EDGE = 1.2; // ... and to the edge of the Paithani strip
const NAME_BLOCK_TOP_NDC = -0.2; // top of the overlay's name block on a phone (about 40% up from the bottom)

const N = 400;
const scenePose = (scene, p) => {
  const [t0, t1] = L.SCENE_RANGES[scene];
  const ps = pose(t0 + p * (t1 - t0));
  const o = L.SCENE_ORIGINS[scene];
  return { ...ps, local: sub(ps.pos, o) };
};

// ---------------------------------------------------------------------------------- framing
function checkFraming(key) {
  const scene = L.sceneIndexOf(key);
  const spot = L.HERO_SPOTS[key];
  const o = L.SCENE_ORIGINS[scene];
  const centre = [o[0] + spot[0], L.HERO_HEIGHT / 2, o[2] + spot[2]];
  const feet = [centre[0], 0, centre[2]];
  const rows = [];

  SCREENS.forEach(([name, aspect], si) => {
    const { tanV, tanH } = halfFovTangents(aspect);
    let worstX = 0, minH = Infinity, maxH = 0, minDist = Infinity, worstY = 0;
    for (let k = 0; k <= 100; k++) {
      const p = WINDOW[0] + (k / 100) * (WINDOW[1] - WINDOW[0]);
      const ps = scenePose(scene, p), b = basis(ps);
      const d = sub(centre, ps.pos), z = dot(d, b.f);
      assert.ok(z > 1, `${key} on ${name}: the hero is behind the camera at progress ${p.toFixed(2)}`);
      worstX = Math.max(worstX, Math.abs(dot(d, b.r) / z / tanH));
      worstY = Math.max(worstY, Math.abs(dot(d, b.u) / z / tanV));
      const h = L.HERO_HEIGHT / (2 * z * tanV);
      minH = Math.min(minH, h); maxH = Math.max(maxH, h);
    }
    for (let k = 0; k <= N; k++) minDist = Math.min(minDist, len(sub(centre, scenePose(scene, k / N).pos)));
    rows.push({ name, worstX, minH, maxH, minDist, worstY });
    const maxX = si <= 1 ? 0.6 : 0.75; // the phones are the narrow views
    assert.ok(worstX <= maxX, `${key} on ${name}: the hero strays to ${worstX.toFixed(2)} (limit ${maxX}) of the half-width`);
    assert.ok(worstY <= 0.6, `${key} on ${name}: the hero's middle strays to ${worstY.toFixed(2)} of the half-height`);
    assert.ok(minDist >= MIN_HERO_DISTANCE, `${key} on ${name}: the camera passes ${minDist.toFixed(1)} m from the hero`);
    assert.ok(maxH <= 0.95, `${key} on ${name}: the hero fills ${(maxH * 100).toFixed(0)}% of the screen`);
  });

  const phone = rows[PHONE];
  assert.ok(phone.minH >= MIN_PHONE_HEIGHT, `${key}: only ${(phone.minH * 100).toFixed(0)}% of the phone's height at the smallest`);
  const { tanV, tanH } = halfFovTangents(SCREENS[PHONE][1]);
  const at = (p) => {
    const ps = scenePose(scene, p), b = basis(ps);
    const proj = (w) => { const d = sub(w, ps.pos), z = dot(d, b.f); return { x: dot(d, b.r) / z / tanH, y: dot(d, b.u) / z / tanV, z }; };
    return { feet: proj(feet), mid: proj(centre) };
  };
  const mid = at(0.5), midHeight = L.HERO_HEIGHT / (2 * mid.mid.z * tanV);
  assert.ok(midHeight >= MIN_PHONE_HEIGHT_AT_NAME, `${key}: ${(midHeight * 100).toFixed(0)}% of the phone's height at the name reveal`);

  // The name is on screen from T.name[0] until it fades (T.out[0]); the hero must still be in frame
  // then, and his feet must be above the name block.
  for (let k = 0; k <= 60; k++) {
    const p = T.name[0] + (k / 60) * (T.out[0] - T.name[0]);
    const a = at(p);
    assert.ok(a.mid.z > 1 && Math.abs(a.mid.x) <= 0.9, `${key}: the hero has left the frame at ${p.toFixed(2)} while his name is still up`);
    if (p <= T.family[1]) assert.ok(a.feet.y >= NAME_BLOCK_TOP_NDC, `${key}: his feet (${a.feet.y.toFixed(2)}) are under the name block at ${p.toFixed(2)}`);
  }
  assert.ok(T.out[1] <= 0.86 + 1e-9, 'the name must be gone before the scene starts to dissolve (0.86)');

  console.log(`${key}: hero ${L.HERO_HEIGHT} m at scene-local (${spot[0]}, ${spot[2]}); gaze hold ${L.SCENE_GAZE[scene].hold}`);
  for (const r of rows) {
    console.log(`  ${r.name.padEnd(16)} |x| <= ${r.worstX.toFixed(2)}  height ${(r.minH * 100).toFixed(0)}%..${(r.maxH * 100).toFixed(0)}% of the screen  closest ${r.minDist.toFixed(1)} m`);
  }
  console.log(`  phone at the name reveal (p 0.5): ${(midHeight * 100).toFixed(0)}% tall, feet at ${mid.feet.y.toFixed(2)} (name block top ${NAME_BLOCK_TOP_NDC})`);
}

// ---------------------------------------------------------------------------- groom clearance
function groomClearance() {
  const scene = L.sceneIndexOf('groom');
  const scale = GROOM_SCALE;
  const hx = GROOM_SPOT[0], hz = GROOM_SPOT[2], baseY = GROOM_POSITION[1];
  const curve = makeCurve(ribbonPoints());
  const closest = {};
  const note = (tier, kind, d) => { const k = `${tier}/${kind}`; closest[k] = Math.min(closest[k] ?? Infinity, d); };

  for (const tier of ['high', 'medium', 'low']) {
    const budget = budgetFor(tier);
    const layout = groveLayout(budget);
    assert.ok(layout.trees.length >= Math.min(budget.trees, 6), `${tier}: too few trees survived the camera clearance (${layout.trees.length})`);
    const trunks = layout.trees.map((t) => { const [x, z] = roomToScene(t.x, t.z); return { x, z, r: t.r * scale }; });
    const clusters = layout.clusters.map((c) => { const [x, z] = roomToScene(c.x, c.z); return { x, y: baseY + c.y * scale, z, a: c.sx * scale, b: c.sy * scale, c: c.sz * scale }; });

    for (let k = 0; k <= N; k++) {
      const p = k / N, ps = scenePose(scene, p), [cx, cy, cz] = ps.local;
      for (const t of trunks) note(tier, 'trunk', Math.hypot(cx - t.x, cz - t.z) - t.r);
      for (const c of clusters) {
        const d = Math.hypot((cx - c.x) / c.a, (cy - c.y) / c.b, (cz - c.z) / c.c); // 1 = on the surface
        note(tier, 'canopy', (d - 1) * Math.min(c.a, c.b, c.c));
      }
      if (tier !== 'high') continue;
      // The ribbon turns with the figure: it faces the camera by FACE_CAMERA of the way from ARRIVAL_YAW.
      const rot = lerpAngle(ARRIVAL_YAW, Math.atan2(cx - hx, cz - hz), FACE_CAMERA);
      const cos = Math.cos(rot), sin = Math.sin(rot);
      const visible = REVEAL.ambient(p) > 0.05 ? Math.min(1, REVEAL.ribbon(p) * 1.06) : 0;
      for (let s = 0; s <= 160; s++) {
        const u = s / 160;
        if (u > visible) break;
        const [rx, ry, rz] = curve(u);
        const wx = hx + scale * (rx * cos + rz * sin), wz = hz + scale * (-rx * sin + rz * cos), wy = baseY + scale * ry;
        note('high', 'ribbon', Math.hypot(cx - wx, cy - wy, cz - wz));
      }
    }
  }
  for (const [k, d] of Object.entries(closest)) {
    const need = k.endsWith('ribbon') ? MIN_RIBBON_CLEARANCE : MIN_SOLID_CLEARANCE;
    assert.ok(d >= need, `groom ${k}: the camera passes ${d.toFixed(2)} m away (minimum ${need})`);
  }
  console.log('  closest the camera gets (true spline, metres): ' + Object.entries(closest).map(([k, d]) => `${k} ${d.toFixed(1)}`).join(', '));
}

// ---------------------------------------------------------------------------- bride clearance
function brideClearance() {
  const scene = BRIDE_SCENE;
  const [hx, , hz] = BRIDE_SPOT;
  const curve = makeCurve(brideRibbonPoints());
  const closest = {};
  const note = (tier, kind, d) => { const k = `${tier}/${kind}`; closest[k] = Math.min(closest[k] ?? Infinity, d); };
  const minLotuses = { high: 10, medium: 7, low: 4 };

  for (const tier of ['high', 'medium', 'low']) {
    const budget = BRIDE_BUDGETS[tier];
    const { lotuses, pads } = pondLayout(budget);
    assert.ok(lotuses.length >= minLotuses[tier], `bride ${tier}: only ${lotuses.length} lotuses survived the camera clearance`);
    assert.ok(pads.length >= Math.floor(budget.pads * 0.6), `bride ${tier}: only ${pads.length} of ${budget.pads} pads were placed`);
    // Nothing may be within the fog's reach of the camera when the scene mounts one segment further back.
    for (const it of [...lotuses, ...pads]) {
      assert.ok(it.z + it.scale * LOTUS_REACH <= NEAREST_Z + 1e-9, `bride ${tier}: something floats at z ${it.z.toFixed(1)}, too near the mount`);
    }
    for (let k = 0; k <= N; k++) {
      const p = k / N, ps = scenePose(scene, p), [cx, cy, cz] = ps.local;
      for (const l of lotuses) {
        // A lotus is a short cylinder standing on the water.
        const dh = Math.max(0, Math.hypot(cx - l.x, cz - l.z) - l.scale * LOTUS_REACH);
        const dv = Math.max(0, cy - l.scale * LOTUS_HEIGHT);
        note(tier, 'lotus', Math.hypot(dh, dv));
      }
      if (tier !== 'high') continue;
      const unfurl = smoothstep(BRIDE_TIMING.unfurl[0], BRIDE_TIMING.unfurl[1], p);
      const visible = brideAmbient(p) > 0.05 ? Math.min(1, unfurl * 1.06) : 0;
      for (let s = 0; s <= 240; s++) {
        const u = s / 240;
        if (u > visible) break;
        const [rx, ry, rz] = curve(u);
        // The strip is RIBBON_WIDTH wide; measure to its edge, not its middle.
        note('high', 'ribbon', Math.hypot(cx - (hx + rx), cy - ry, cz - (hz + rz)) - RIBBON_WIDTH / 2);
      }
    }
  }
  // The water stops short of where the camera starts, so it never shows beside the previous scene.
  assert.ok(POND_CENTRE[1] + POND_RADIUS <= NEAREST_Z, 'the pond reaches too close to the camera start');
  for (const [k, d] of Object.entries(closest)) {
    const need = k.endsWith('ribbon') ? MIN_BRIDE_RIBBON_EDGE : MIN_LOTUS_CLEARANCE;
    assert.ok(d >= need, `bride ${k}: the camera passes ${d.toFixed(2)} m away (minimum ${need})`);
  }
  console.log(`  pond scale x${POND_SCALE.toFixed(2)}; closest the camera gets (true spline, metres): ` + Object.entries(closest).map(([k, d]) => `${k} ${d.toFixed(1)}`).join(', '));
}

for (const key of ['groom', 'bride']) checkFraming(key);
groomClearance();
brideClearance();
console.log('hero checks passed');
