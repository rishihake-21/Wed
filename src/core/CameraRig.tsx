import { useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { sampleCameraPose } from './cameraPath';
import { FRAME_PRIORITY } from './frameOrder';
import { useAppStore } from './store';

// Higher = snappier. These only soften speed changes at scene boundaries and scroll flicks.
const POSITION_LAMBDA = 10;
const LOOK_LAMBDA = 6;
/** A target further than this from the camera is a jump (menu link, skip): snap instead of flying through the world. */
const SNAP_DISTANCE = 60;
/** Cap the frame delta so a backgrounded tab doesn't produce one giant step. */
const MAX_DELTA = 0.1;

/**
 * Moves the camera along the spline for the current master time `t`.
 * A programmatic jump (store.jump) snaps instead of flying, because the scenes in between are
 * already unmounted; Phase 2 hides the cut with a diya-light flash.
 * Reduced-motion handling (crossfades instead of camera flights) arrives in Phase 9.
 */
export function CameraRig() {
  const camera = useThree((s) => s.camera);

  const rig = useMemo(
    () => ({
      position: new Vector3(),
      lookAt: new Vector3(),
      targetPosition: new Vector3(),
      targetLookAt: new Vector3(),
      ready: false,
      jumpId: useAppStore.getState().jump?.id ?? 0,
    }),
    [],
  );

  useFrame((_, delta) => {
    const { t, jump } = useAppStore.getState();
    sampleCameraPose(t, rig.targetPosition, rig.targetLookAt);

    if (jump && jump.id !== rig.jumpId) {
      rig.jumpId = jump.id;
      rig.ready = false; // snap below
    }

    if (!rig.ready || rig.position.distanceTo(rig.targetPosition) > SNAP_DISTANCE) {
      rig.position.copy(rig.targetPosition);
      rig.lookAt.copy(rig.targetLookAt);
      rig.ready = true;
    } else {
      const dt = Math.min(delta, MAX_DELTA);
      rig.position.lerp(rig.targetPosition, 1 - Math.exp(-POSITION_LAMBDA * dt));
      rig.lookAt.lerp(rig.targetLookAt, 1 - Math.exp(-LOOK_LAMBDA * dt));
    }

    camera.position.copy(rig.position);
    camera.lookAt(rig.lookAt);
  }, FRAME_PRIORITY.camera);

  return null;
}
