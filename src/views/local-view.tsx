import { useMemo, useState } from "react";
import { PackageOpen, RefreshCw, Search } from "lucide-react";
import { useSkills } from "@/hooks/use-skills";
import { SkillListItem } from "@/components/skill-list-item";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import type { ProviderFilter, Skill } from "@/lib/types";

interface LocalViewProps {
  providerFilter: ProviderFilter;
  onSkillSelect: (skill: Skill) => void;
  selectedSkill: Skill | null;
}

export function LocalView({
  providerFilter,
  onSkillSelect,
  selectedSkill,
}: LocalViewProps) {
  const { skills, loading, refresh } = useSkills(providerFilter);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSkills = useMemo(() => {
    if (!searchQuery.trim()) return skills;
    const q = searchQuery.toLowerCase();
    return skills.filter(
      (s) =>
        s.dirName.toLowerCase().includes(q) ||
        s.name?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q)
    );
  }, [skills, searchQuery]);

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索本机 skill..."
            className="h-8 border-[var(--border)] bg-[var(--input)] pl-8 text-sm text-[var(--foreground)]"
          />
        </div>
        <button
          onClick={refresh}
          className="shrink-0 rounded-md p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-[64px] animate-pulse rounded-lg bg-[var(--secondary)]"
            />
          ))}
        </div>
      ) : skills.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title="未发现 skill"
          description="在 ~/.claude/skills 与 ~/.agents/skills 未找到 skill"
        />
      ) : filteredSkills.length === 0 ? (
        <EmptyState
          icon={Search}
          title="无匹配"
          description="尝试其他关键词"
        />
      ) : (
        <div className="space-y-1.5">
          <div className="mb-2 text-xs text-[var(--muted-foreground)]">
            {filteredSkills.length} 个 skill
          </div>
          {filteredSkills.map((skill) => (
            <SkillListItem
              key={`${skill.provider}-${skill.dirName}`}
              skill={skill}
              selected={
                selectedSkill?.provider === skill.provider &&
                selectedSkill?.dirName === skill.dirName
              }
              onClick={() => onSkillSelect(skill)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
