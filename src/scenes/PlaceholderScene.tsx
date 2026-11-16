import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CanvasTexture, SRGBColorSpace } from 'three';
import type { Mesh } from 'three';
import { SCENE_META } from '../core/layout';
import type { SceneProps } from '../core/types';
import { colors } from '../theme/tokens';

const PALETTE = [colors.yamuna, colors.peacock, colors.gold, colors.marigold, colors.lotus];

const BAR_WIDTH = 3;

/** Dev-only label: big scene number plus its developer name. Latin text only. */
function makeLabelTexture(number: number, label: string): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = colors.midnight;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = colors.gold;
    ctx.font = 'bold 130px system-ui, sans-serif';
    ctx.fillText(String(number), 256, 100);
    ctx.fillStyle = colors.cream;
    ctx.font = '44px system-ui, sans-serif';
    ctx.fillText(label, 256, 205);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

interface PlaceholderSceneProps extends SceneProps {
  /** 0-based scene index. */
  index: number;
}

/**
 * Stand-in for a real scene: a coloured box on a grid floor, labelled with its number,
 * with a bar that fills with the scene's local progress and a box that turns with it.
 * Each real scene replaces its placeholder in Phases 3–8.
 */
export function PlaceholderScene({ index, progress }: PlaceholderSceneProps) {
  const color = PALETTE[index % PALETTE.length];
  const box = useRef<Mesh>(null);
  const bar = useRef<Mesh>(null);

  const label = useMemo(() => makeLabelTexture(index + 1, SCENE_META[index].label), [index]);
  // Textures handed to materials aren't disposed by R3F, so free it ourselves when the scene unmounts.
  useEffect(() => () => label.dispose(), [label]);

  useFrame(() => {
    const p = progress.current;
    if (box.current) box.current.rotation.y = p * Math.PI * 2;
    if (bar.current) {
      bar.current.scale.x = Math.max(p, 0.001);
      bar.current.position.x = -BAR_WIDTH / 2 + (BAR_WIDTH * p) / 2;
    }
  });

  return (
    <group>
      <gridHelper args={[30, 15, colors.gold, colors.yamuna]} />

      <mesh ref={box} position={[0, 1.5, 0]}>
        <boxGeometry args={[3, 3, 3]} />
        <meshStandardMaterial color={color} />
      </mesh>

      <sprite position={[0, 5.2, 0]} scale={[6, 3, 1]}>
        <spriteMaterial map={label} transparent depthWrite={false} />
      </sprite>

      {/* Progress track and fill, on the ground in front of the box. */}
      <mesh position={[0, 0.06, 2.4]}>
        <boxGeometry args={[BAR_WIDTH, 0.1, 0.28]} />
        <meshBasicMaterial color={colors.cream} transparent opacity={0.25} />
      </mesh>
      <mesh ref={bar} position={[-BAR_WIDTH / 2, 0.1, 2.4]}>
        <boxGeometry args={[BAR_WIDTH, 0.12, 0.3]} />
        <meshBasicMaterial color={colors.gold} />
      </mesh>
    </group>
  );
}
