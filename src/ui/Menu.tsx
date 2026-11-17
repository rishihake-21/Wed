import { useEffect, useRef, useState } from 'react';
import { content } from '../content/content';
import type { UiKey } from '../content/content';
import { useLocalized } from '../content/useLocalized';
import { sceneIndexOf } from '../core/layout';
import type { SceneKey } from '../core/layout';
import { useAppStore } from '../core/store';
import { chip } from './controlStyles';

/** Jump links, in the order the spec lists them. Each scene key is also the label's UiKey. */
const LINKS: readonly { scene: SceneKey; label: UiKey }[] = [
  { scene: 'date', label: 'date' },
  { scene: 'venue', label: 'venue' },
  { scene: 'schedule', label: 'schedule' },
  { scene: 'rsvp', label: 'rsvp' },
];

/**
 * Menu with jump links to Date, Venue, Schedule and RSVP. Works during the intro too: a jump
 * ends Part A and drops the guest straight into the scroll journey at that scene.
 */
export function Menu() {
  const [open, setOpen] = useState(false);
  const activeScene = useAppStore((s) => s.activeScene);
  const jumpToScene = useAppStore((s) => s.jumpToScene);
  const l = useLocalized();

  const trigger = useRef<HTMLButtonElement>(null);
  const firstLink = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    firstLink.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div>
      <button
        ref={trigger}
        type="button"
        aria-label={l(content.ui.menu)}
        aria-expanded={open}
        aria-controls="jump-menu"
        onClick={() => setOpen((o) => !o)}
        className={`${chip} relative z-20 flex h-11 w-11 items-center justify-center rounded-full`}
      >
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>

      {open && (
        <>
          {/* Tap anywhere outside the panel to close it. */}
          <div className="pointer-events-auto fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
          <nav
            id="jump-menu"
            aria-label={l(content.ui.menu)}
            className="pointer-events-auto relative z-20 mt-2 flex w-56 flex-col gap-1 rounded-2xl border border-gold/40 bg-midnight/90 p-2 backdrop-blur"
          >
            {LINKS.map(({ scene, label }, i) => {
              const index = sceneIndexOf(scene);
              const current = index === activeScene;
              return (
                <button
                  key={scene}
                  ref={i === 0 ? firstLink : undefined}
                  type="button"
                  aria-current={current ? 'true' : undefined}
                  onClick={() => {
                    setOpen(false);
                    jumpToScene(index);
                  }}
                  className={`min-h-[48px] rounded-xl px-4 text-left text-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-cream ${
                    current ? 'bg-gold text-midnight' : 'text-cream'
                  }`}
                >
                  {l(content.ui[label])}
                </button>
              );
            })}
          </nav>
        </>
      )}
    </div>
  );
}
