import { Howl, Howler } from 'howler';
import { DefaultLoadingManager } from 'three';
import { manifest } from '../assets/manifest';
import { useAppStore } from '../core/store';

/**
 * Audio for the whole experience: one looping ambient bed, played through Howler (Web Audio).
 *
 * Browsers block sound until a tap, so the flow is:
 *   preloadAudio()  when the gate mounts: starts the download and reports it to three's
 *                   loading manager, so the diya loader (drei useProgress) can count it
 *   unlockAudio()   inside the Enter tap: resumes the AudioContext
 *   startAudio()    inside the Enter tap: marks the bed as wanted
 *
 * Whether the bed is actually audible is derived in one place (`reconcile`) from three
 * facts: it has been started, the guest hasn't muted it, and the tab is visible. Every
 * change to any of them calls `reconcile`, which fades in or out and pauses when silent.
 *
 * Known platform limit: on iPhone, Web Audio follows the ring/silent switch, so the bed is
 * silent while the phone is in silent mode.
 */

const FADE_IN_MS = 1500;
const FADE_OUT_MS = 350;

let bed: Howl | null = null;
let bedId: number | undefined;
let started = false;
let pauseTimer: number | undefined;

function isAudible(): boolean {
  return started && !useAppStore.getState().muted && !document.hidden;
}

function reconcile(): void {
  if (!bed) return;
  window.clearTimeout(pauseTimer);

  if (isAudible()) {
    if (bedId === undefined) {
      bedId = bed.play(); // Howler queues this if the file is still loading; starts at volume 0
    } else if (bed.state() === 'loaded' && !bed.playing(bedId)) {
      bed.play(bedId); // resume after a pause
    }
    bed.fade(bed.volume(bedId) as number, manifest.audio.bed.volume, FADE_IN_MS, bedId);
  } else if (bedId !== undefined) {
    const id = bedId;
    bed.fade(bed.volume(id) as number, 0, FADE_OUT_MS, id);
    // Pause once the fade has finished, unless sound came back in the meantime.
    pauseTimer = window.setTimeout(() => {
      if (!isAudible()) bed?.pause(id);
    }, FADE_OUT_MS + 50);
  }
}

let unsubscribeStore: (() => void) | undefined;

/** Starts downloading the bed. Safe to call repeatedly. */
export function preloadAudio(): void {
  if (bed) return;

  const url = manifest.audio.bed.src[0];
  DefaultLoadingManager.itemStart(url); // makes drei's useProgress count the audio
  let settled = false;
  const settle = () => {
    if (settled) return;
    settled = true;
    DefaultLoadingManager.itemEnd(url);
  };

  bed = new Howl({
    src: [...manifest.audio.bed.src],
    loop: true,
    volume: 0,
    preload: true,
    onload: settle,
    onloaderror: (_id, error) => {
      // A missing file must not block the invitation: carry on silently.
      console.warn(`[audio] could not load ${url}:`, error);
      DefaultLoadingManager.itemError(url);
      settle();
    },
  });

  unsubscribeStore = useAppStore.subscribe((s, prev) => {
    if (s.muted !== prev.muted) reconcile();
  });
  document.addEventListener('visibilitychange', reconcile);
}

/** Call synchronously inside a tap handler: resumes the AudioContext the browser suspended. */
export function unlockAudio(): void {
  const ctx = Howler.ctx;
  if (ctx && ctx.state !== 'running') void ctx.resume().catch(() => undefined);
}

/** Call inside the Enter tap, after unlockAudio. Honours mute and tab visibility. */
export function startAudio(): void {
  started = true;
  reconcile();
}

/** One-line status for the dev overlay, e.g. "ctx running · bed playing · vol 0.60". */
export function audioStatus(): string {
  const ctx = Howler.ctx ? Howler.ctx.state : 'none';
  if (!bed) return `ctx ${ctx} · not loaded`;
  const playing = bedId !== undefined && bed.playing(bedId);
  const volume = bedId !== undefined ? (bed.volume(bedId) as number).toFixed(2) : '-';
  return `ctx ${ctx} · bed ${bed.state()}${playing ? ' playing' : ''} · vol ${volume}`;
}

// Dev hot-reload: stop the old module's sound and listeners so edits don't stack up audio.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    window.clearTimeout(pauseTimer);
    document.removeEventListener('visibilitychange', reconcile);
    unsubscribeStore?.();
    bed?.unload();
  });
}
