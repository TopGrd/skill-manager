import { useMemo, useState } from "react";
import { FolderGit, Plus, Search } from "lucide-react";
import { useRepos } from "@/hooks/use-repos";
import { AddRepoDialog } from "@/components/add-repo-dialog";
import { EmptyState } from "@/components/empty-state";
import { SkillPreview } from "@/components/skill-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Skill } from "@/lib/types";

interface MarketReposProps {
  onInstallClick: (skill: Skill, repoUrl: string, sourcePath: string) => void;
}

interface RepoSkillEntry {
  skill: Skill;
  repoUrl: string;
  repoName: string;
  repoLocalPath: string;
}

export function MarketRepos({ onInstallClick }: MarketReposProps) {
  const { repos, loading, addRepo } = useRepos();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState<RepoSkillEntry | null>(null);
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);

  const allSkills = useMemo(() => {
    return repos.flatMap((repo) =>
      repo.skills.map((skill) => ({
        skill,
        repoUrl: repo.url,
        repoName: `${repo.owner}/${repo.name}`,
        repoLocalPath: repo.localPath,
      }))
    );
  }, [repos]);

  const filteredSkills = useMemo(() => {
    if (!searchQuery.trim()) return allSkills;
    const q = searchQuery.toLowerCase();
    return allSkills.filter(
      (entry) =>
        entry.skill.dirName.toLowerCase().includes(q) ||
        entry.skill.name?.toLowerCase().includes(q) ||
        entry.skill.description?.toLowerCase().includes(q)
    );
  }, [allSkills, searchQuery]);

  const getSkillMdPath = (entry: RepoSkillEntry): string => {
    const relativePath = (entry.skill as any).relativePath;
    if (relativePath) {
      return `${entry.repoLocalPath}/${relativePath}/SKILL.md`;
    }
    return `${entry.skill.path}/SKILL.md`;
  };

  const getSkillSourcePath = (entry: RepoSkillEntry): string => {
    const relativePath = (entry.skill as any).relativePath;
    if (relativePath) {
      return `${entry.repoLocalPath}/${relativePath}`;
    }
    return entry.skill.path;
  };

  const handleInstallSelected = () => {
    if (!selected) return;
    setInstalling(true);
    onInstallClick(selected.skill, selected.repoUrl, getSkillSourcePath(selected));
    setTimeout(() => {
      setInstalling(false);
      setInstalled(true);
    }, 500);
  };

  if (selected) {
    return (
      <SkillPreview
        name={selected.skill.dirName}
        description={selected.skill.description}
        extra={selected.repoName}
        skillMdPath={getSkillMdPath(selected)}
        installing={installing}
        installed={installed}
        onInstall={handleInstallSelected}
        onBack={() => {
          setSelected(null);
          setInstalling(false);
          setInstalled(false);
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-[64px] animate-pulse rounded-lg bg-[var(--secondary)]" />
        ))}
      </div>
    );
  }

  if (repos.length === 0) {
    return (
      <>
        <EmptyState
          icon={FolderGit}
          title="未添加仓库"
          description="添加 git 仓库以浏览和安装 skill"
          action={<Button variant="secondary" onClick={() => setShowAddDialog(true)}>添加仓库</Button>}
        />
        <AddRepoDialog open={showAddDialog} onOpenChange={setShowAddDialog} onAdd={async (url) => { await addRepo(url); }} />
      </>
    );
  }

  return (
    <>
      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索已添加仓库中的 skill..."
            className="h-8 border-[var(--border)] bg-[var(--input)] pl-8 text-sm text-[var(--foreground)]"
          />
        </div>
        <Button variant="secondary" size="sm" onClick={() => setShowAddDialog(true)} className="h-8">
          <Plus className="mr-1 h-3 w-3" /> 添加
        </Button>
      </div>
      <p className="mb-3 text-xs text-[var(--muted-foreground)]">
        搜索范围：已添加的 {repos.length} 个仓库
      </p>

      {filteredSkills.length === 0 ? (
        <EmptyState icon={Search} title="无匹配" description="搜索范围：已添加的仓库" />
      ) : (
        <div className="space-y-2">
          {filteredSkills.map((entry) => (
            <div
              key={`${entry.repoUrl}-${entry.skill.dirName}`}
              className="flex cursor-pointer items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 transition-colors hover:bg-[var(--secondary)]"
              onClick={() => setSelected(entry)}
            >
              <div className="min-w-0 flex-1 pr-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--foreground)]">{entry.skill.dirName}</span>
                  {!entry.skill.valid && (
                    <span className="text-xs text-[var(--destructive)]">invalid</span>
                  )}
                </div>
                {entry.skill.description && (
                  <p className="mt-0.5 truncate text-xs text-[var(--muted-foreground)]">{entry.skill.description}</p>
                )}
                <p className="mt-0.5 text-xs text-[var(--muted-foreground)] opacity-60">{entry.repoName}</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onInstallClick(entry.skill, entry.repoUrl, getSkillSourcePath(entry));
                }}
              >
                安装
              </Button>
            </div>
          ))}
        </div>
      )}

      <AddRepoDialog open={showAddDialog} onOpenChange={setShowAddDialog} onAdd={async (url) => { await addRepo(url); }} />
    </>
  );
}
