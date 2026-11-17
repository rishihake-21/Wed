import { colors } from '../theme/tokens';

interface DiyaLoaderProps {
  /** 0–1. The flame grows from a small ember to its full size. */
  progress: number;
  label: string;
}

const FLAME_BASE = { x: 60, y: 72 };
const FLAME_ORIGIN = `${FLAME_BASE.x}px ${FLAME_BASE.y}px`;

/**
 * A clay diya whose flame grows with loading progress. Pure SVG so it paints instantly,
 * long before the 3D scene is ready. The flicker is a CSS animation (off for reduced motion).
 */
export function DiyaLoader({ progress, label }: DiyaLoaderProps) {
  const p = Math.min(1, Math.max(0, progress));
  const flameScale = 0.16 + 0.84 * p;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(p * 100)}
      className="relative h-44 w-44"
    >
      <svg viewBox="0 0 120 120" className="h-full w-full overflow-visible" aria-hidden="true">
        <defs>
          <radialGradient id="diya-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={colors.marigold} stopOpacity="0.55" />
            <stop offset="100%" stopColor={colors.marigold} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="diya-clay" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.gold} />
            <stop offset="100%" stopColor={colors.marigold} />
          </linearGradient>
          <linearGradient id="diya-flame" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={colors.marigold} />
            <stop offset="100%" stopColor={colors.gold} />
          </linearGradient>
        </defs>

        {/* Light thrown on the surroundings, brighter as the flame grows. */}
        <circle
          cx={FLAME_BASE.x}
          cy={FLAME_BASE.y - 14}
          r="64"
          fill="url(#diya-glow)"
          style={{ opacity: 0.25 + 0.75 * p, transition: 'opacity 500ms ease-out' }}
        />

        {/* Flame: outer group grows with progress, inner group flickers. */}
        <g style={{ transform: `scale(${flameScale})`, transformOrigin: FLAME_ORIGIN, transition: 'transform 500ms ease-out' }}>
          <g className="diya-flicker" style={{ transformOrigin: FLAME_ORIGIN }}>
            <path
              d="M60 26 C67 38 77 48 75 60 C74 67 68 72 60 72 C52 72 46 67 45 60 C43 48 53 38 60 26 Z"
              fill="url(#diya-flame)"
            />
            <path d="M60 45 C64 52 68 57 66 63 C65 67 63 69 60 69 C57 69 55 67 54 63 C52 57 56 52 60 45 Z" fill={colors.cream} opacity="0.9" />
          </g>
        </g>

        {/* The lamp: a shallow clay bowl with a pinched spout on the right. */}
        <path d="M16 74 C16 93 36 102 60 102 C84 102 104 93 104 74 Z" fill="url(#diya-clay)" />
        <path d="M100 74 C108 72 114 66 117 60 C116 70 110 79 100 83 Z" fill={colors.gold} />
        <ellipse cx="60" cy="74" rx="44" ry="6" fill={colors.gold} />
        <ellipse cx="60" cy="74" rx="38" ry="3.5" fill={colors.midnight} opacity="0.7" />
      </svg>
    </div>
  );
}
