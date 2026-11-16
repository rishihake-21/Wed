import { content } from '../content/content';
import { useLocalized } from '../content/useLocalized';
import { DEV_FLAGS } from '../core/devFlags';
import { useAppStore } from '../core/store';

/**
 * Temporary entry screen. Tapping Enter drops straight into scroll mode over all nine
 * placeholder scenes. Phase 2 replaces this with the real diya loader, audio unlock and
 * the auto-playing Part A.
 */
export function GateStub() {
  const stage = useAppStore((s) => s.stage);
  const startJourney = useAppStore((s) => s.startJourney);
  const l = useLocalized();

  if (stage !== 'gate') return null;

  return (
    <div className="pointer-events-auto absolute inset-0 flex flex-col items-center justify-center gap-8 bg-midnight/90 px-6 text-center">
      <p className="font-marathi text-3xl text-gold">{l(content.invocation.primary)}</p>
      <button
        type="button"
        onClick={() => startJourney(0)}
        className="min-h-[56px] rounded-full bg-gold px-12 text-xl font-semibold text-midnight"
      >
        {l(content.ui.enter)}
      </button>
      {DEV_FLAGS.showDebug && (
        <p className="text-sm text-cream/60">Phase 1 stub: replaced by the real entry gate in Phase 2.</p>
      )}
    </div>
  );
}
