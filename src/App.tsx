import { useEffect } from 'react';
import { Experience } from './core/Experience';
import { PartADriver } from './core/PartADriver';
import { useAppStore } from './core/store';
import { Hud } from './ui/Hud';

export default function App() {
  const language = useAppStore((s) => s.language);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-midnight">
      <Experience />
      <PartADriver />
      <Hud />
    </div>
  );
}
