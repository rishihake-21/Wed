import { content } from '../content/content';
import { useLocalized } from '../content/useLocalized';
import { useAppStore } from '../core/store';
import { chip } from './controlStyles';

/** Skip the intro. Shown only while Part A plays. */
export function SkipButton() {
  const skipIntro = useAppStore((s) => s.skipIntro);
  const l = useLocalized();

  return (
    <div className="absolute inset-x-0 bottom-0 flex justify-center pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <button type="button" onClick={skipIntro} className={`${chip} min-h-[44px] rounded-full px-8 text-base`}>
        {l(content.ui.skip)}
      </button>
    </div>
  );
}
