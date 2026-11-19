import { useEffect, useRef } from 'react';
import { audioStatus } from '../audio/audioManager';
import { RENDER_STATS } from '../core/renderStats';
import { mountedSceneIndices, SCENE_COUNT, SCENE_META } from '../core/layout';
import { useAppStore } from '../core/store';
import type { AppState } from '../core/store';

function format(s: AppState): string {
  const mounted = mountedSceneIndices(s.activeScene)
    .map((i) => i + 1)
    .join(', ');
  return [
    `stage    ${s.stage}`,
    `t        ${s.t.toFixed(4)}`,
    `scene    ${s.activeScene + 1}/${SCENE_COUNT} ${SCENE_META[s.activeScene].label}`,
    `mounted  [${mounted}]`,
    `quality  ${s.quality} (detected ${s.detectedQuality}: ${s.qualityNote})`,
    `motion   ${s.reducedMotion ? 'reduced' : 'full'}`,
    `sound    ${s.muted ? 'muted' : 'on'} · ${audioStatus()}`,
    `render   ${RENDER_STATS.calls} draws · ${(RENDER_STATS.triangles / 1000).toFixed(1)}k tris`,
  ].join('\n');
}

/**
 * Debug readout. Writes straight to the DOM from a store subscription so it never causes
 * React re-renders while `t` changes every frame.
 */
export function DevOverlay() {
  const ref = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const render = (s: AppState) => {
      if (ref.current) ref.current.textContent = format(s);
    };
    render(useAppStore.getState());
    const unsubscribe = useAppStore.subscribe(render);
    // Audio state lives in Howler, not the store, so poll it a few times a second.
    const poll = window.setInterval(() => render(useAppStore.getState()), 250);
    return () => {
      unsubscribe();
      window.clearInterval(poll);
    };
  }, []);

  return (
    <pre
      ref={ref}
      className="pointer-events-none absolute left-3 top-16 max-w-[calc(100%-1.5rem)] whitespace-pre-wrap rounded bg-midnight/70 p-2 font-mono text-xs leading-snug text-cream/90"
    />
  );
}
