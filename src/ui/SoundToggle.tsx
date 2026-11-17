import { content } from '../content/content';
import { useLocalized } from '../content/useLocalized';
import { useAppStore } from '../core/store';
import { chip } from './controlStyles';

/** Global mute. Pressed = sound on. */
export function SoundToggle() {
  const muted = useAppStore((s) => s.muted);
  const setMuted = useAppStore((s) => s.setMuted);
  const l = useLocalized();

  return (
    <button
      type="button"
      aria-pressed={!muted}
      aria-label={l(content.ui.sound)}
      onClick={() => setMuted(!muted)}
      className={`${chip} flex h-11 w-11 items-center justify-center rounded-full`}
    >
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 9v6h4l5 4V5L8 9H4z" />
        {muted ? (
          <path d="M16.5 9.5l5 5M21.5 9.5l-5 5" />
        ) : (
          <path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11" />
        )}
      </svg>
    </button>
  );
}
