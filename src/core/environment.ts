import { getGPUTier } from 'detect-gpu';
import { DEV_FLAGS } from './devFlags';
import { decideQuality } from './quality';
import type { QualitySignals } from './quality';
import { useAppStore } from './store';

/** Don't let a slow benchmark download hold up the tier decision. */
const GPU_DETECT_TIMEOUT_MS = 2500;

type NavigatorExtras = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean; effectiveType?: string };
};

function hasWebGL2(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    gl?.getExtension('WEBGL_lose_context')?.loseContext(); // free the probe context right away
    return gl !== null;
  } catch {
    return false;
  }
}

/** detect-gpu tier (0–3) and whether it thinks this is a phone/tablet. `null` tier = unknown. */
async function probeGpu(): Promise<{ tier: number | null; isMobile: boolean }> {
  const fallbackMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent);
  try {
    const result = await Promise.race([
      getGPUTier(),
      new Promise<null>((resolve) => window.setTimeout(() => resolve(null), GPU_DETECT_TIMEOUT_MS)),
    ]);
    if (!result) return { tier: null, isMobile: fallbackMobile };
    return { tier: result.tier, isMobile: result.isMobile ?? fallbackMobile };
  } catch {
    return { tier: null, isMobile: fallbackMobile };
  }
}

async function detectQuality(): Promise<void> {
  const nav = navigator as NavigatorExtras;
  const webgl2 = hasWebGL2();
  // No point benchmarking a GPU that can't run the 3D at all.
  const gpu = webgl2 ? await probeGpu() : { tier: null, isMobile: false };

  const signals: QualitySignals = {
    webgl2,
    gpuTier: gpu.tier,
    isMobile: gpu.isMobile,
    deviceMemoryGb: nav.deviceMemory ?? null,
    saveData: nav.connection?.saveData === true,
    slowConnection: nav.connection?.effectiveType === 'slow-2g' || nav.connection?.effectiveType === '2g',
  };
  const { tier, note } = decideQuality(signals);
  useAppStore.getState().applyDetectedQuality(tier, note);
}

/** Keeps the store's reducedMotion flag in step with the OS setting while the page is open. */
function watchReducedMotion(): void {
  const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  query?.addEventListener?.('change', (e) => useAppStore.getState().setReducedMotion(e.matches));
}

let started = false;

/**
 * One-time startup probes, called from main.tsx before React renders:
 *  - quality tier (GPU + memory + data saver), skipped when ?quality= forces one;
 *  - live reduced-motion flag.
 * Detection runs in the background; the store starts on a safe default and updates when done.
 */
export function initEnvironment(): void {
  if (started) return;
  started = true;
  watchReducedMotion();
  if (DEV_FLAGS.forcedQuality === null) void detectQuality();
}
