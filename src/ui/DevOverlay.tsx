import { useEffect, useRef } from 'react';
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
    `quality  ${s.quality}`,
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
    return useAppStore.subscribe(render);
  }, []);

  return (
    <pre
      ref={ref}
      className="pointer-events-none absolute left-3 top-16 rounded bg-midnight/70 p-2 font-mono text-xs leading-snug text-cream/90"
    />
  );
}
