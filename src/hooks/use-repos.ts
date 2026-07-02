import { useCallback, useEffect, useState } from "react";
import { addRepo as addRepoCmd } from "@/lib/commands";
import type { Repo } from "@/lib/types";

const SEED_REPOS = ["https://github.com/anthropics/skills"];
const STORAGE_KEY = "skill-manager-repos";

export function useRepos() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSavedUrls = (): string[] => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : SEED_REPOS;
    } catch {
      return SEED_REPOS;
    }
  };

  const saveUrls = (urls: string[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(urls));
  };

  const loadRepos = useCallback(async () => {
    const urls = loadSavedUrls();
    setLoading(true);
    setError(null);

    const results: Repo[] = [];
    for (const url of urls) {
      try {
        const repo = await addRepoCmd(url);
        results.push(repo);
      } catch (e) {
        console.error(`Failed to load repo ${url}:`, e);
      }
    }

    setRepos(results);
    setLoading(false);
  }, []);

  const addRepo = async (url: string) => {
    setError(null);
    try {
      const repo = await addRepoCmd(url);
      setRepos((prev) => [...prev.filter((r) => r.url !== url), repo]);
      const urls = loadSavedUrls();
      if (!urls.includes(url)) {
        saveUrls([...urls, url]);
      }
      return repo;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      throw e;
    }
  };

  const removeRepo = (url: string) => {
    setRepos((prev) => prev.filter((r) => r.url !== url));
    const urls = loadSavedUrls().filter((u) => u !== url);
    saveUrls(urls);
  };

  useEffect(() => {
    loadRepos();
  }, [loadRepos]);

  return { repos, loading, error, addRepo, removeRepo, refresh: loadRepos };
}
