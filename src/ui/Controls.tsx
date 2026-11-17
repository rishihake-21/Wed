import { useAppStore } from '../core/store';
import { LanguageToggle } from './LanguageToggle';
import { Menu } from './Menu';
import { SkipButton } from './SkipButton';
import { SoundToggle } from './SoundToggle';

/**
 * The always-visible controls once the film starts: menu (top left), sound and language
 * (top right), and Skip (bottom centre) while the intro plays. The gate has its own
 * larger language picker and small sound/lite toggles.
 */
export function Controls() {
  const stage = useAppStore((s) => s.stage);
  if (stage === 'gate') return null;

  return (
    <>
      <div className="absolute left-0 top-0 p-3 pl-[max(0.75rem,env(safe-area-inset-left))] pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Menu />
      </div>
      <div className="absolute right-0 top-0 flex items-center gap-2 p-3 pr-[max(0.75rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))]">
        <SoundToggle />
        <LanguageToggle />
      </div>
      {stage === 'cinematic' && <SkipButton />}
    </>
  );
}
