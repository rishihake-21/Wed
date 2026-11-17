import { create } from 'zustand';
import { DEV_FLAGS } from './devFlags';
import { clamp01, PART_A_END_T, sceneIndexAt, sceneStartT } from './layout';
import { resolveQuality } from './quality';
import type { Lang, QualityTier, Stage } from './types';

const LANG_STORAGE_KEY = 'wed.lang';

function readStoredLanguage(): Lang {
  try {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (stored === 'mr' || stored === 'en') return stored;
  } catch {
    // Storage can be blocked (private mode, in-app browsers); fall through to the default.
  }
  return 'mr'; // Marathi first
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
}

/** A programmatic move of the journey (menu link, Skip, hand-over). `id` increases with every one. */
export interface JumpRequest {
  id: number;
  t: number;
}

function nextJump(prev: JumpRequest | null, t: number): JumpRequest {
  return { id: (prev?.id ?? 0) + 1, t };
}

/**
 * Menu jumps land this far (in `t`) inside the target scene. Landing exactly on the boundary
 * can round to the end of the previous scene: browsers snap scroll positions to whole pixels.
 */
const JUMP_NUDGE_T = 0.001;

export interface AppState {
  language: Lang;
  muted: boolean;
  /** The tier scenes read: `detectedQuality`, unless the guest flipped the Lite toggle. */
  quality: QualityTier;
  /** What device detection chose (or the ?quality= override). */
  detectedQuality: QualityTier;
  /** Why detection chose it, for the dev overlay. */
  qualityNote: string;
  /** The guest's manual Lite choice: null = follow detection. */
  liteOverride: boolean | null;
  reducedMotion: boolean;
  stage: Stage;

  /** Master journey time, 0–1. Written every frame during scroll/auto-play. */
  t: number;
  /** Index of the scene that owns `t`. Only changes at scene boundaries. */
  activeScene: number;
  /** `t` at which the scroll journey starts: 0 for the dev shortcut, PART_A_END_T after Part A. */
  journeyFromT: number;
  /**
   * The latest programmatic jump. CameraRig snaps to the new pose and JourneyScroll moves the
   * scroll position when `id` changes. Subscribe imperatively; it is not meant to drive renders.
   */
  jump: JumpRequest | null;

  setLanguage: (lang: Lang) => void;
  toggleLanguage: () => void;
  setMuted: (muted: boolean) => void;
  setQuality: (quality: QualityTier) => void;
  /** Called once by device detection; keeps a manual Lite choice intact. */
  applyDetectedQuality: (tier: QualityTier, note: string) => void;
  toggleLite: () => void;
  setReducedMotion: (reduced: boolean) => void;
  /** Entering 'journey' goes through startJourney(t), so scroll starts where the camera is. */
  setStage: (stage: Stage) => void;
  /** Low-level write of `t`. In journey mode the scroll position overwrites it every frame; use jumpTo to move. */
  setT: (t: number) => void;
  /** Enter scroll mode with scroll offset 0 mapped to `fromT`. The camera snaps there. */
  startJourney: (fromT?: number) => void;
  /**
   * Move to master time `t` from anywhere. In journey mode it re-aims the scroll position and
   * snaps the camera. From the gate or the intro it first starts the journey at the end of
   * Part A (so everything in Part B stays reachable by scrolling), then jumps within it.
   */
  jumpTo: (t: number) => void;
  /** Skip the intro: end Part A and hand over to scroll. */
  skipIntro: () => void;
  /** Menu link: jump to the start of scene `sceneIndex`, ending Part A if it is still playing. */
  jumpToScene: (sceneIndex: number) => void;
}

/**
 * Global state. Components that only need a per-frame value (`t`) should read it with
 * `useAppStore.getState().t` inside `useFrame`, not subscribe to it — a subscription
 * would re-render the component 60 times a second.
 */
export const useAppStore = create<AppState>()((set, get) => ({
  language: readStoredLanguage(),
  muted: false,
  quality: DEV_FLAGS.forcedQuality ?? 'medium', // replaced when device detection finishes
  detectedQuality: DEV_FLAGS.forcedQuality ?? 'medium',
  qualityNote: DEV_FLAGS.forcedQuality ? 'forced by ?quality=' : 'detecting…',
  liteOverride: null,
  reducedMotion: prefersReducedMotion(),
  stage: DEV_FLAGS.startInJourney ? 'journey' : 'gate',

  t: 0,
  activeScene: 0,
  journeyFromT: 0,
  jump: null,

  setLanguage: (language) => {
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, language);
    } catch {
      // Persisting is best-effort.
    }
    set({ language });
  },
  toggleLanguage: () => get().setLanguage(get().language === 'mr' ? 'en' : 'mr'),
  setMuted: (muted) => set({ muted }),
  setQuality: (quality) => set({ quality }),
  applyDetectedQuality: (detectedQuality, qualityNote) =>
    set({ detectedQuality, qualityNote, quality: resolveQuality(detectedQuality, get().liteOverride) }),
  toggleLite: () => {
    const liteOverride = get().quality !== 'lite';
    set({ liteOverride, quality: resolveQuality(get().detectedQuality, liteOverride) });
  },
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setStage: (stage) => {
    if (stage === 'journey') get().startJourney(get().t);
    else set({ stage });
  },

  setT: (value) => {
    const t = clamp01(value);
    const activeScene = sceneIndexAt(t);
    set(activeScene === get().activeScene ? { t } : { t, activeScene });
  },
  startJourney: (fromT = 0) => {
    const t = clamp01(fromT);
    set((s) => ({
      stage: 'journey',
      journeyFromT: t,
      t,
      activeScene: sceneIndexAt(t),
      jump: nextJump(s.jump, t),
    }));
  },
  jumpTo: (target) => {
    const wanted = clamp01(target);
    if (get().stage !== 'journey') {
      get().startJourney(Math.min(wanted, PART_A_END_T));
      if (wanted <= PART_A_END_T) return; // the journey already starts exactly there
    }
    const s = get();
    // Scroll offset 0 is journeyFromT, so nothing earlier than that is reachable.
    const t = Math.max(wanted, s.journeyFromT);
    set({ t, activeScene: sceneIndexAt(t), jump: nextJump(s.jump, t) });
  },
  skipIntro: () => {
    if (get().stage === 'cinematic') get().startJourney(PART_A_END_T);
  },
  jumpToScene: (sceneIndex) => get().jumpTo(sceneStartT(sceneIndex) + JUMP_NUDGE_T),
}));
