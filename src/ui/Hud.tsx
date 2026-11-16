import { content } from '../content/content';
import { useLocalized } from '../content/useLocalized';
import { DEV_FLAGS } from '../core/devFlags';
import { useAppStore } from '../core/store';
import { DevOverlay } from './DevOverlay';
import { GateStub } from './GateStub';
import { LanguageToggle } from './LanguageToggle';

/**
 * DOM layer above the canvas. The layer itself ignores pointer events so scroll and touch
 * reach the scene; interactive children opt back in with `pointer-events-auto`.
 * Sound, skip and menu controls are added in Phase 2.
 */
export function Hud() {
  const stage = useAppStore((s) => s.stage);
  const l = useLocalized();

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <GateStub />

      <div className="absolute right-0 top-0 p-3 pr-[max(0.75rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))]">
        <LanguageToggle />
      </div>

      {stage === 'journey' && (
        <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-midnight/80 to-transparent px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-12 text-center text-base text-cream">
          {l(content.ui.scrollHint)}
        </p>
      )}

      {DEV_FLAGS.showDebug && <DevOverlay />}
    </div>
  );
}
