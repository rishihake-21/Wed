import { content } from '../content/content';
import { useLocalized } from '../content/useLocalized';
import { DEV_FLAGS } from '../core/devFlags';
import { useAppStore } from '../core/store';
import { Controls } from './Controls';
import { DevOverlay } from './DevOverlay';
import { Gate } from './Gate';
import { SceneOverlays } from './overlays/SceneOverlays';

/**
 * DOM layer above the canvas. The layer itself ignores pointer events so scroll and touch
 * reach the scene; interactive children opt back in with `pointer-events-auto`.
 */
export function Hud() {
  const stage = useAppStore((s) => s.stage);
  const l = useLocalized();

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <SceneOverlays />
      <Controls />

      {stage === 'journey' && (
        <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-midnight/80 to-transparent px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-12 text-center text-base text-cream">
          {l(content.ui.scrollHint)}
        </p>
      )}

      {/* Last, so it sits above the controls: it fades out when the film starts. */}
      <Gate />

      {DEV_FLAGS.showDebug && <DevOverlay />}
    </div>
  );
}
