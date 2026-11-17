// Guards the device-quality rules (src/core/quality.ts), which are pure and so testable without a
// device. Needs Node 22.6+; no install required.
//   npm run check
import assert from 'node:assert/strict';
import { decideQuality, resolveQuality } from '../src/core/quality.ts';

// A strong desktop; each case below changes one thing.
const base = { webgl2: true, gpuTier: 3, deviceMemoryGb: 8, saveData: false, slowConnection: false, isMobile: false };
const tier = (over) => decideQuality({ ...base, ...over }).tier;
const note = (over) => decideQuality({ ...base, ...over }).note;

// Hard fallbacks to lite (2D)
assert.equal(tier({}), 'high');
assert.equal(tier({ webgl2: false }), 'lite');
assert.equal(tier({ saveData: true }), 'lite');
assert.equal(tier({ slowConnection: true }), 'lite');
assert.equal(tier({ gpuTier: 0 }), 'lite');
assert.equal(tier({ deviceMemoryGb: 1 }), 'lite');
assert.equal(tier({ deviceMemoryGb: 0.5 }), 'lite');

// The first rule that applies wins, and says why
assert.equal(note({ webgl2: false, saveData: true }), 'no WebGL2');
assert.equal(note({ saveData: true, gpuTier: 0 }), 'data saver on');

// The GPU tier sets the ceiling
assert.equal(tier({ gpuTier: 3 }), 'high');
assert.equal(tier({ gpuTier: 2 }), 'medium');
assert.equal(tier({ gpuTier: 1 }), 'low');

// Memory caps it, and never raises it
assert.equal(tier({ gpuTier: 3, deviceMemoryGb: 4 }), 'medium');
assert.equal(tier({ gpuTier: 3, deviceMemoryGb: 2 }), 'low');
assert.equal(tier({ gpuTier: 2, deviceMemoryGb: 2 }), 'low');
assert.equal(tier({ gpuTier: 1, deviceMemoryGb: 4 }), 'low');
assert.equal(tier({ gpuTier: 2, deviceMemoryGb: 8 }), 'medium');
assert.match(note({ gpuTier: 3, deviceMemoryGb: 4 }), /capped by 4 GB/);

// Unknown GPU (detection failed or timed out): cautious on phones, middling on desktops
assert.equal(tier({ gpuTier: null, isMobile: true }), 'low');
assert.equal(tier({ gpuTier: null, isMobile: false }), 'medium');
assert.equal(tier({ gpuTier: null, isMobile: true, deviceMemoryGb: 4 }), 'low');
assert.equal(tier({ gpuTier: null, isMobile: false, deviceMemoryGb: null }), 'medium');
assert.equal(tier({ gpuTier: 3, deviceMemoryGb: null }), 'high'); // memory not reported (Safari, Firefox)

// The tier scenes read: detection, unless the guest flipped the Lite toggle
assert.equal(resolveQuality('high', null), 'high');
assert.equal(resolveQuality('high', true), 'lite');
assert.equal(resolveQuality('high', false), 'high');
assert.equal(resolveQuality('lite', null), 'lite');
assert.equal(resolveQuality('lite', false), 'low'); // turning Lite off on a device sent to lite gives low, not lite
assert.equal(resolveQuality('low', false), 'low');

console.log('quality checks passed');
