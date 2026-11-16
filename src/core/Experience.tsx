import { Canvas } from '@react-three/fiber';
import { Stats } from '@react-three/drei';
import { colors } from '../theme/tokens';
import { CameraRig } from './CameraRig';
import { DEV_FLAGS } from './devFlags';
import { JourneyScroll } from './JourneyScroll';
import { CAMERA_WAYPOINTS } from './layout';
import { SceneManager } from './SceneManager';
import { useAppStore } from './store';

/** Pixel-ratio cap. 1.5 for phones; the desktop cap of 2 and adaptive resolution arrive in Phase 10. */
const MAX_DPR = 1.5;

const [START_X, START_Y, START_Z] = CAMERA_WAYPOINTS[0];

export function Experience() {
  const stage = useAppStore((s) => s.stage);

  return (
    <div className="absolute inset-0">
      <Canvas
        dpr={[1, MAX_DPR]}
        camera={{ fov: 60, near: 0.1, far: 200, position: [START_X, START_Y, START_Z] }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={[colors.midnight]} />
        <fog attach="fog" args={[colors.midnight, 25, 80]} />

        {/* Budget: at most two real-time lights, no real-time shadows. */}
        <ambientLight intensity={0.7} />
        <directionalLight position={[10, 20, 5]} intensity={1.2} />

        <CameraRig />
        <SceneManager />

        {stage === 'journey' && <JourneyScroll />}
        {DEV_FLAGS.showDebug && <Stats />}
      </Canvas>
    </div>
  );
}
