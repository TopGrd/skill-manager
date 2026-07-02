import { useCallback, useEffect, useState } from "react";
import { getSkills } from "@/lib/commands";
import type { Provider, ProviderFilter, Skill } from "@/lib/types";

export function useSkills(filter: ProviderFilter) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const provider: Provider | undefined =
        filter === "all" ? undefined : filter;
      const result = await getSkills(provider);
      setSkills(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { skills, loading, error, refresh };
}
