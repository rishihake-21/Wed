import { content } from '../../content/content';
import { useLocalized } from '../../content/useLocalized';
import { sceneIndexOf } from '../../core/layout';
import { SCENE_PROGRESS } from '../../core/sceneProgress';
import { colors } from '../../theme/tokens';
import { useFadeWindow } from './useFadeWindow';

/**
 * Scene 1 text. Devanagari is always HTML, never 3D text: the shaping and accessibility are
 * the browser's job. A soft dark scrim sits behind it so it stays readable over the moon's
 * glitter column and the flames; cream (not gold) keeps the line above the 3:1 large-text
 * contrast bar even where the glitter is brightest, and the gold survives as its glow.
 */
export function InvocationOverlay() {
  const l = useLocalized();
  const ref = useFadeWindow<HTMLDivElement>(SCENE_PROGRESS[sceneIndexOf('invocation')], { in: [0.1, 0.26], out: [0.82, 0.96] });
  const { primary, family } = content.invocation;

  return (
    <div
      ref={ref}
      style={{ opacity: 0 }}
      className="absolute inset-x-0 bottom-[20%] flex flex-col items-center gap-3 px-6 py-10 text-center"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{ background: `radial-gradient(ellipse at center, ${colors.midnight}d9 0%, ${colors.midnight}99 45%, transparent 75%)` }}
      />
      <p
        lang="mr"
        className="font-marathi text-[clamp(1.9rem,8vw,3rem)] leading-snug text-cream"
        style={{ textShadow: `0 0 22px ${colors.gold}99, 0 2px 12px ${colors.midnight}cc` }}
      >
        {l(primary)}
      </p>
      {family && (
        <p lang="mr" className="font-marathi text-[clamp(1.5rem,5vw,1.75rem)] leading-snug text-cream">
          {l(family)}
        </p>
      )}
    </div>
  );
}
