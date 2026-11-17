/**
 * Every shipped file is named here and nowhere else.
 * Phase 2 starts it with audio; Phase 10 adds models, textures and images, each with a
 * fallback to its procedural stand-in.
 *
 * Replace a placeholder by dropping a file with the same name into /public/audio.
 */
export const manifest = {
  audio: {
    /** Ambient bansuri bed, looped for the whole experience. Keep total audio under ~3 MB. */
    bed: { src: ['/audio/bed.mp3'], volume: 0.6 },
  },
} as const;
