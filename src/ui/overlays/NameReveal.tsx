import { useLocalized } from '../../content/useLocalized';
import type { PersonEntry } from '../../content/content';
import { useAppStore } from '../../core/store';
import type { SceneProgress } from '../../core/types';
import { colors } from '../../theme/tokens';
import { useFadeWindow, useRevealSweep } from './useFadeWindow';
import type { FadeWindow } from './useFadeWindow';

export interface NameRevealTiming {
  /** The gold name sweeps in across this progress range. */
  name: readonly [number, number];
  /** The family line fades in over this range. */
  family: readonly [number, number];
  /** Everything fades out over this range. */
  out: readonly [number, number];
}

interface NameRevealProps {
  person: PersonEntry;
  progress: SceneProgress;
  timing: NameRevealTiming;
}

const GOLD_TEXT = `linear-gradient(100deg, ${colors.gold} 0%, ${colors.cream} 42%, ${colors.gold} 58%, ${colors.marigold} 100%)`;
const SWEEP_MASK = 'linear-gradient(90deg, #000 calc(var(--reveal) * 118% - 18%), transparent calc(var(--reveal) * 118%))';

/**
 * A person's name revealed in gold, with the other language's spelling beneath it and the family
 * line below. The name sweeps in left to right with the scene's progress. Shared by the groom's
 * and the bride's scenes: pass the person and when each part should appear.
 */
export function NameReveal({ person, progress, timing }: NameRevealProps) {
  const l = useLocalized();
  const language = useAppStore((s) => s.language);

  const fadeName: FadeWindow = { in: [timing.name[0], timing.name[0] + 0.03], out: timing.out };
  const nameRef = useFadeWindow<HTMLDivElement>(progress, fadeName);
  const sweepRef = useRevealSweep<HTMLParagraphElement>(progress, timing.name);
  const familyRef = useFadeWindow<HTMLDivElement>(progress, { in: timing.family, out: timing.out });

  const other = language === 'mr' ? person.name.en : person.name.mr;
  const nameFont = language === 'mr' ? 'font-marathi' : 'font-display';
  const otherFont = language === 'mr' ? 'font-display' : 'font-marathi';
  const prefix = person.prefix ? l(person.prefix) : '';

  return (
    <div className="absolute inset-x-0 bottom-[12%] flex flex-col items-center px-6 py-10 text-center">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{ background: `radial-gradient(ellipse at center, ${colors.midnight}d9 0%, ${colors.midnight}99 45%, transparent 75%)` }}
      />

      <div ref={nameRef} style={{ opacity: 0 }} className="flex flex-col items-center gap-1">
        {prefix && <span className="font-marathi text-lg text-cream/80">{prefix}</span>}
        <p
          ref={sweepRef}
          className={`${nameFont} text-[clamp(2.4rem,11vw,3.6rem)] leading-tight`}
          style={{
            backgroundImage: GOLD_TEXT,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            color: 'transparent',
            WebkitMaskImage: SWEEP_MASK,
            maskImage: SWEEP_MASK,
          }}
        >
          {l(person.name)}
        </p>
        <p className={`${otherFont} text-2xl text-gold`}>{other}</p>
      </div>

      <div ref={familyRef} style={{ opacity: 0 }} className="mt-3 flex flex-col items-center gap-3">
        <span aria-hidden="true" className="block h-px w-24" style={{ background: `linear-gradient(90deg, transparent, ${colors.gold}, transparent)` }} />
        <p className="font-marathi text-[clamp(1.15rem,4.6vw,1.6rem)] leading-snug text-cream">{l(person.family)}</p>
      </div>
    </div>
  );
}
