import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "skill-manager-settings";

interface Settings {
  extraDirs: string[];
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>({ extraDirs: [] });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setSettings(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const save = useCallback((next: Settings) => {
    setSettings(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const addExtraDir = useCallback(
    (dir: string) => {
      if (!settings.extraDirs.includes(dir)) {
        save({ ...settings, extraDirs: [...settings.extraDirs, dir] });
      }
    },
    [settings, save]
  );

  const removeExtraDir = useCallback(
    (dir: string) => {
      save({
        ...settings,
        extraDirs: settings.extraDirs.filter((d) => d !== dir),
      });
    },
    [settings, save]
  );

  return { settings, addExtraDir, removeExtraDir };
}
