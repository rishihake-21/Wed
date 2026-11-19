import { useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RENDER_STATS } from './renderStats';

/**
 * Dev only. Reports draw calls and triangles for the whole frame, post-processing passes
 * included. three.js resets `renderer.info` on every render() call by default, which would
 * leave only the last post-processing pass in the numbers, so reset it manually, once per frame.
 */
export function RenderStats() {
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    gl.info.autoReset = false;
    return () => {
      gl.info.autoReset = true;
    };
  }, [gl]);

  // Runs before this frame's render, so `info` still holds the previous frame's totals.
  useFrame(() => {
    RENDER_STATS.calls = gl.info.render.calls;
    RENDER_STATS.triangles = gl.info.render.triangles;
    gl.info.reset();
  });

  return null;
}
