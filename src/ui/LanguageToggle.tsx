import { content } from '../content/content';
import { useLocalized } from '../content/useLocalized';
import { useAppStore } from '../core/store';
import type { Lang } from '../core/types';

const LANGS: readonly Lang[] = ['mr', 'en'];

/** Marathi / English switch. The choice persists (see store.setLanguage). */
export function LanguageToggle() {
  const language = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const l = useLocalized();

  return (
    <div
      role="group"
      aria-label={l(content.ui.language)}
      className="pointer-events-auto flex overflow-hidden rounded-full border border-gold/60 bg-midnight/60 backdrop-blur"
    >
      {LANGS.map((lang) => {
        const selected = lang === language;
        return (
          <button
            key={lang}
            type="button"
            lang={lang}
            aria-pressed={selected}
            onClick={() => setLanguage(lang)}
            className={`min-h-[44px] min-w-[44px] px-4 text-base transition-colors ${
              selected ? 'bg-gold text-midnight' : 'text-cream'
            }`}
          >
            {content.languages[lang]}
          </button>
        );
      })}
    </div>
  );
}
