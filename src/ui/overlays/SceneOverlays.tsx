import { SCENE_META } from '../../core/layout';
import { useAppStore } from '../../core/store';
import { OVERLAYS } from './registry';

/**
 * The HTML text layer for the scene on screen. Each scene's overlay mounts only while that scene
 * is active and fades itself with useFadeWindow. Register new ones in registry.ts.
 */
export function SceneOverlays() {
  const activeScene = useAppStore((s) => s.activeScene);
  const Overlay = OVERLAYS[SCENE_META[activeScene].key];

  return Overlay ? <Overlay key={activeScene} /> : null;
}
