import { Color, SRGBColorSpace } from 'three';

/**
 * A shade between two theme colours as a CSS hex string, for canvas textures that paint with
 * strings. Pass colours from `theme/tokens.ts` so the palette stays in one place.
 */
export function shade(from: string, to: string, amount: number): string {
  return `#${new Color(from).lerp(new Color(to), amount).getHexString()}`;
}

/** A colour with an alpha, as a CSS rgba() string (the channels are read back in sRGB, as CSS expects). */
export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = new Color(hex).getRGB({ r: 0, g: 0, b: 0 }, SRGBColorSpace);
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${alpha})`;
}
