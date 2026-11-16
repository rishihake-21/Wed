import { create } from 'zustand';
import { DEV_FLAGS } from './devFlags';
import { clamp01, sceneIndexAt } from './layout';
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

export interface AppState {
  language: Lang;
  muted: boolean;
  quality: QualityTier;
  reducedMotion: boolean;
  stage: Stage;

  /** Master journey time, 0–1. Written every frame during scroll/auto-play. */
  t: number;
  /** Index of the scene that owns `t`. Only changes at scene boundaries. */
  activeScene: number;
  /** `t` at which the scroll journey starts: 0 for the dev shortcut, PART_A_END_T after Part A. */
  journeyFromT: number;

  setLanguage: (lang: Lang) => void;
  toggleLanguage: () => void;
  setMuted: (muted: boolean) => void;
  setQuality: (quality: QualityTier) => void;
  setReducedMotion: (reduced: boolean) => void;
  setStage: (stage: Stage) => void;
  setT: (t: number) => void;
  /** Enter scroll mode with scroll offset 0 mapped to `fromT`. */
  startJourney: (fromT?: number) => void;
}

/**
 * Global state. Components that only need a per-frame value (`t`) should read it with
 * `useAppStore.getState().t` inside `useFrame`, not subscribe to it — a subscription
 * would re-render the component 60 times a second.
 */
export const useAppStore = create<AppState>()((set, get) => ({
  language: readStoredLanguage(),
  muted: false,
  quality: DEV_FLAGS.forcedQuality ?? 'medium', // detect-gpu picks the real tier in Phase 2
  reducedMotion: prefersReducedMotion(),
  stage: DEV_FLAGS.startInJourney ? 'journey' : 'gate',

  t: 0,
  activeScene: 0,
  journeyFromT: 0,

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
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setStage: (stage) => set({ stage }),

  setT: (value) => {
    const t = clamp01(value);
    const activeScene = sceneIndexAt(t);
    set(activeScene === get().activeScene ? { t } : { t, activeScene });
  },
  startJourney: (fromT = 0) => {
    const t = clamp01(fromT);
    set({ stage: 'journey', journeyFromT: t, t, activeScene: sceneIndexAt(t) });
  },
}));
