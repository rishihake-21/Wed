import { Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { SCENES } from '../scenes';
import { mountedSceneIndices, SCENE_ORIGINS } from './layout';
import { SCENE_PROGRESS, syncSceneProgress } from './sceneProgress';
import { useAppStore } from './store';

/**
 * Mounts only the active scene and the one after it (so the next can preload), each in a
 * group at its world origin. Everything else is unmounted, which frees its GPU resources.
 * Also publishes every scene's local progress once per frame.
 */
export function SceneManager() {
  // Re-renders only when the active scene changes, never per frame.
  const active = useAppStore((s) => s.activeScene);
  const quality = useAppStore((s) => s.quality);

  useFrame(() => {
    syncSceneProgress(useAppStore.getState().t);
  });

  return (
    <Suspense fallback={null}>
      {mountedSceneIndices(active).map((i) => {
        const Scene = SCENES[i];
        const [ox, oy, oz] = SCENE_ORIGINS[i];
        return (
          <group key={i} position={[ox, oy, oz]}>
            <Scene progress={SCENE_PROGRESS[i]} quality={quality} />
          </group>
        );
      })}
    </Suspense>
  );
}
