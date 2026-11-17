import { useLayoutEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Stats } from '@react-three/drei';
import { PerspectiveCamera } from 'three';
import { colors } from '../theme/tokens';
import { CameraRig } from './CameraRig';
import { DEV_FLAGS } from './devFlags';
import { JourneyScroll } from './JourneyScroll';
import { CAMERA_WAYPOINTS, FOV_LANDSCAPE, fovForAspect, SEGMENT_LENGTH } from './layout';
import { SceneManager } from './SceneManager';
import { useAppStore } from './store';
import type { QualityTier } from './types';

/**
 * Pixel-ratio cap per quality tier. 1.5 is the phone cap; the desktop cap of 2 and adaptive
 * resolution arrive in Phase 10. `lite` doesn't render WebGL at all (Phase 9).
 */
const DPR_CAP: Record<QualityTier, number> = { high: 1.5, medium: 1.5, low: 1, lite: 1 };

/**
 * Fog starts close and ends exactly one scene-length away. The next room mounts one scene-length
 * ahead of the camera, so it is fully fogged when it appears instead of popping into view.
 */
const FOG_NEAR = 10;
const FOG_FAR = SEGMENT_LENGTH;

const [START_X, START_Y, START_Z] = CAMERA_WAYPOINTS[0];

/** Keeps the vertical field of view matched to the screen shape (wider on portrait phones). */
function ResponsiveFov() {
  const camera = useThree((s) => s.camera);
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);

  useLayoutEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return;
    camera.fov = fovForAspect(height > 0 ? width / height : 1);
    camera.updateProjectionMatrix();
  }, [camera, width, height]);

  return null;
}

export function Experience() {
  const stage = useAppStore((s) => s.stage);
  const quality = useAppStore((s) => s.quality);

  return (
    <div className="absolute inset-0">
      <Canvas
        dpr={[1, DPR_CAP[quality]]}
        camera={{ fov: FOV_LANDSCAPE, near: 0.1, far: 200, position: [START_X, START_Y, START_Z] }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={[colors.midnight]} />
        <fog attach="fog" args={[colors.midnight, FOG_NEAR, FOG_FAR]} />

        {/* Budget: at most two real-time lights, no real-time shadows. */}
        <ambientLight intensity={0.7} />
        <directionalLight position={[10, 20, 5]} intensity={1.2} />

        <ResponsiveFov />
        <CameraRig />
        <SceneManager />

        {stage === 'journey' && <JourneyScroll />}
        {/* Mid-left, so the FPS panel doesn't cover the menu button (top left). */}
        {DEV_FLAGS.showDebug && <Stats className="!left-2 !top-1/2" />}
      </Canvas>
    </div>
  );
}
