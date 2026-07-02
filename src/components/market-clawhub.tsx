import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, Search, TrendingUp } from "lucide-react";
import { clawhubSearch, clawhubList, clawhubInstall, clawhubDetail } from "@/lib/commands";
import { EmptyState } from "@/components/empty-state";
import { SkillPreview } from "@/components/skill-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ClawHubSearchResult, ClawHubSkill, Provider } from "@/lib/types";

interface MarketClawHubProps {
  targetProvider: Provider;
  onInstallSuccess: () => void;
}

interface SelectedSkill {
  slug: string;
  name: string;
  summary: string | null;
  extra?: string | null;
}

export function MarketClawHub({ targetProvider, onInstallSuccess }: MarketClawHubProps) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ClawHubSearchResult[]>([]);
  const [trending, setTrending] = useState<ClawHubSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [installingSlug, setInstallingSlug] = useState<string | null>(null);
  const [installedSlugs, setInstalledSlugs] = useState<Set<string>>(new Set());

  const [selected, setSelected] = useState<SelectedSkill | null>(null);
  const [detailContent, setDetailContent] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    clawhubList("trending", 30)
      .then(setTrending)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await clawhubSearch(query.trim());
      setSearchResults(results);
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  }, [query]);

  const handleInstall = async (slug: string) => {
    setInstallingSlug(slug);
    try {
      await clawhubInstall(slug, targetProvider);
      setInstalledSlugs((prev) => new Set(prev).add(slug));
      onInstallSuccess();
    } catch (e) {
      console.error("Install failed:", e);
    } finally {
      setInstallingSlug(null);
    }
  };

  const handleSelect = async (skill: SelectedSkill) => {
    setSelected(skill);
    setDetailContent(null);
    setDetailLoading(true);
    try {
      const detail = await clawhubDetail(skill.slug);
      setDetailContent(detail.description || detail.summary || null);
    } catch (e) {
      console.error(e);
      setDetailContent(null);
    } finally {
      setDetailLoading(false);
    }
  };

  if (selected) {
    return (
      <SkillPreview
        name={selected.name}
        description={selected.summary}
        extra={selected.extra}
        skillMdContent={detailLoading ? null : detailContent}
        installing={installingSlug === selected.slug}
        installed={installedSlugs.has(selected.slug)}
        onInstall={() => handleInstall(selected.slug)}
        onBack={() => setSelected(null)}
      />
    );
  }

  const showSearch = query.trim().length > 0;

  return (
    <div>
      <div className="relative mb-4">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted-foreground)]" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="搜索 ClawHub skill..."
          className="h-8 border-[var(--border)] bg-[var(--input)] pl-8 pr-16 text-sm text-[var(--foreground)]"
        />
        <button
          onClick={handleSearch}
          disabled={searching}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded px-2 py-0.5 text-xs text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
        >
          {searching ? "..." : "搜索"}
        </button>
      </div>

      {showSearch ? (
        searchResults.length === 0 && !searching ? (
          <EmptyState icon={Search} title="无匹配" description="尝试其他关键词" />
        ) : (
          <div className="space-y-2">
            {searchResults.map((s) => (
              <SkillRow
                key={s.slug}
                name={s.displayName || s.slug}
                summary={s.summary}
                extra={s.ownerHandle}
                installing={installingSlug === s.slug}
                installed={installedSlugs.has(s.slug)}
                onInstall={() => handleInstall(s.slug)}
                onClick={() =>
                  handleSelect({
                    slug: s.slug,
                    name: s.displayName || s.slug,
                    summary: s.summary,
                    extra: s.ownerHandle,
                  })
                }
              />
            ))}
          </div>
        )
      ) : loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[60px] animate-pulse rounded-lg bg-[var(--secondary)]" />
          ))}
        </div>
      ) : (
        <div>
          <div className="mb-3 flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
            <TrendingUp className="h-3.5 w-3.5" /> 热门
          </div>
          <div className="space-y-2">
            {trending.map((s) => (
              <SkillRow
                key={s.slug}
                name={s.displayName || s.slug}
                summary={s.summary}
                extra={s.stats?.downloads ? `${s.stats.downloads} 下载` : undefined}
                installing={installingSlug === s.slug}
                installed={installedSlugs.has(s.slug)}
                onInstall={() => handleInstall(s.slug)}
                onClick={() =>
                  handleSelect({
                    slug: s.slug,
                    name: s.displayName || s.slug,
                    summary: s.summary,
                    extra: s.stats?.downloads ? `${s.stats.downloads} 下载` : undefined,
                  })
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SkillRow({
  name,
  summary,
  extra,
  installing,
  installed,
  onInstall,
  onClick,
}: {
  name: string;
  summary: string | null;
  extra?: string | null;
  installing: boolean;
  installed: boolean;
  onInstall: () => void;
  onClick: () => void;
}) {
  return (
    <div
      className="flex cursor-pointer items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 transition-colors hover:bg-[var(--secondary)]"
      onClick={onClick}
    >
      <div className="min-w-0 flex-1 pr-3">
        <span className="text-sm font-medium text-[var(--foreground)]">{name}</span>
        {summary && <p className="mt-0.5 truncate text-xs text-[var(--muted-foreground)]">{summary}</p>}
        {extra && <p className="mt-0.5 text-xs text-[var(--muted-foreground)] opacity-60">{extra}</p>}
      </div>
      <Button
        variant="secondary"
        size="sm"
        disabled={installing || installed}
        onClick={(e) => {
          e.stopPropagation();
          onInstall();
        }}
      >
        {installed ? (
          <><Check className="mr-1 h-3 w-3 text-green-400" /><span className="text-green-400">已安装</span></>
        ) : installing ? (
          <><Loader2 className="mr-1 h-3 w-3 animate-spin" />安装中</>
        ) : (
          "安装"
        )}
      </Button>
    </div>
  );
}
