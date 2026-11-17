import { useEffect, useState } from 'react';
import { useProgress } from '@react-three/drei';
import { preloadAudio, startAudio, unlockAudio } from '../audio/audioManager';
import { content } from '../content/content';
import { useLocalized } from '../content/useLocalized';
import { useAppStore } from '../core/store';
import { chip } from './controlStyles';
import { DiyaLoader } from './DiyaLoader';
import { LanguageToggle } from './LanguageToggle';
import { SoundToggle } from './SoundToggle';

/** The diya is on screen at least this long, so the flame visibly grows even on a fast load. */
const MIN_LOADER_MS = 1400;
/** After this long the film starts anyway; scenes that are still loading simply appear when ready. */
const MAX_WAIT_MS = 8000;
const TICK_MS = 100;

/**
 * Scene 0: the entry gate. A diya whose flame grows with real asset progress (drei's
 * useProgress, which also counts the audio bed), a language picker, a large Enter button
 * and small sound and Lite toggles.
 *
 * Enter is usable immediately. The tap unlocks audio (browsers only allow that inside a
 * gesture) and starts the bed; the film then starts as soon as loading has finished. If
 * the guest taps early, the button shows "Loading…" until then.
 */
export function Gate() {
  const stage = useAppStore((s) => s.stage);
  const setStage = useAppStore((s) => s.setStage);
  const quality = useAppStore((s) => s.quality);
  const toggleLite = useAppStore((s) => s.toggleLite);
  const language = useAppStore((s) => s.language);
  const l = useLocalized();

  const loading = useProgress((s) => s.active);
  const loadProgress = useProgress((s) => s.progress);

  const [elapsedMs, setElapsedMs] = useState(0);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    preloadAudio();
  }, []);

  useEffect(() => {
    const startedAt = performance.now();
    const id = window.setInterval(() => {
      const elapsed = performance.now() - startedAt;
      setElapsedMs(elapsed);
      if (elapsed >= MAX_WAIT_MS) window.clearInterval(id);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const assetFraction = loading ? loadProgress / 100 : 1;
  const timeFraction = Math.min(1, elapsedMs / MIN_LOADER_MS);
  const flame = Math.min(assetFraction, timeFraction);
  const ready = (elapsedMs >= MIN_LOADER_MS && !loading) || elapsedMs >= MAX_WAIT_MS;

  useEffect(() => {
    if (entered && ready && stage === 'gate') setStage('cinematic');
  }, [entered, ready, stage, setStage]);

  const handleEnter = () => {
    if (entered) return;
    unlockAudio(); // must run inside this tap
    startAudio();
    setEntered(true);
  };

  const onGate = stage === 'gate';
  const titleFont = language === 'mr' ? 'font-marathi' : 'font-display';

  return (
    <div
      aria-hidden={!onGate}
      className={`absolute inset-0 overflow-y-auto bg-midnight transition-[opacity,visibility] duration-1000 ease-out ${
        onGate ? 'pointer-events-auto opacity-100' : 'pointer-events-none invisible opacity-0'
      }`}
    >
      <div className="mx-auto flex min-h-full w-full max-w-sm flex-col items-center justify-center gap-7 px-6 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] text-center">
        <DiyaLoader progress={flame} label={l(content.ui.loading)} />

        <h1 className={`${titleFont} text-3xl leading-snug text-gold`}>{l(content.meta.title)}</h1>

        <LanguageToggle large />

        <button
          type="button"
          onClick={handleEnter}
          disabled={entered}
          aria-busy={entered && !ready}
          className="min-h-[60px] w-full rounded-full bg-gold px-12 text-xl font-semibold text-midnight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream disabled:opacity-80"
        >
          {entered ? l(content.ui.loading) : l(content.ui.enter)}
        </button>

        <div className="flex items-center gap-4">
          <SoundToggle />
          <button
            type="button"
            aria-pressed={quality === 'lite'}
            onClick={toggleLite}
            className={`${chip} min-h-[44px] rounded-full px-5 text-base ${quality === 'lite' ? '!bg-gold !text-midnight' : ''}`}
          >
            {l(content.ui.lite)}
          </button>
        </div>
      </div>
    </div>
  );
}
