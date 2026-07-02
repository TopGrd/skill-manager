import { useState } from "react";
import { Plus, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { LocalView } from "@/views/local-view";
import { MarketPanel } from "@/views/market-view";
import { SkillDetailView } from "@/views/skill-detail-view";
import { SettingsView } from "@/views/settings-view";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { installSkill, uninstallSkill, checkExisting } from "@/lib/commands";
import type { Provider, ProviderFilter, Skill } from "@/lib/types";

interface PendingInstall {
  skill: Skill;
  repoUrl: string;
  sourcePath: string;
  existingPaths: string[];
}

const PROVIDER_FILTERS: { value: ProviderFilter; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "claude-code", label: "Claude Code" },
  { value: "codex", label: "Codex" },
];

function App() {
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>("all");
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [showSettings, setShowSettings] = useState(false);
  const [showMarket, setShowMarket] = useState(false);

  const [pendingInstall, setPendingInstall] = useState<PendingInstall | null>(null);
  const [installLoading, setInstallLoading] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  const [pendingUninstall, setPendingUninstall] = useState<Skill | null>(null);
  const [uninstallLoading, setUninstallLoading] = useState(false);
  const [uninstallSuccess, setUninstallSuccess] = useState(false);

  const handleInstallClick = async (
    skill: Skill,
    repoUrl: string,
    sourcePath: string
  ) => {
    const providers: Provider[] = ["claude-code", "codex"];
    const existing = await checkExisting(skill.dirName, providers);
    setPendingInstall({ skill, repoUrl, sourcePath, existingPaths: existing });
  };

  const handleInstallConfirm = async () => {
    if (!pendingInstall) return;
    setInstallLoading(true);
    try {
      await installSkill({
        sourcePath: pendingInstall.sourcePath,
        providers: ["claude-code"],
        repoUrl: pendingInstall.repoUrl,
      });
      setInstallLoading(false);
      setInstallSuccess(true);
      setRefreshKey((k) => k + 1);
      setTimeout(() => {
        setPendingInstall(null);
        setInstallSuccess(false);
      }, 1000);
    } catch (e) {
      console.error("Install failed:", e);
      setInstallLoading(false);
    }
  };

  const handleUninstallConfirm = async () => {
    if (!pendingUninstall) return;
    setUninstallLoading(true);
    try {
      await uninstallSkill(pendingUninstall.path);
      setUninstallLoading(false);
      setUninstallSuccess(true);
      setRefreshKey((k) => k + 1);
      setTimeout(() => {
        setPendingUninstall(null);
        setUninstallSuccess(false);
        setSelectedSkill(null);
      }, 1000);
    } catch (e) {
      console.error("Uninstall failed:", e);
      setUninstallLoading(false);
    }
  };

  if (showSettings) {
    return (
      <div className="flex h-screen flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-2">
          <Button variant="secondary" size="sm" onClick={() => setShowSettings(false)}>
            ← 返回
          </Button>
          <span className="text-sm font-medium text-[var(--foreground)]">设置</span>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <SettingsView />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Top bar */}
      <div
        className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-4 py-2"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      >
        <div
          className="flex items-center gap-4"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          <span className="text-sm font-semibold text-[var(--foreground)]">
            Skill Manager
          </span>
          <div className="flex gap-1">
            {PROVIDER_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setProviderFilter(f.value)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs transition-all",
                  providerFilter === f.value
                    ? "bg-[var(--muted)] font-medium text-[var(--foreground)]"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div
          className="flex items-center gap-1"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowMarket(true)}
            className="h-7 text-xs"
          >
            <Plus className="mr-1 h-3 w-3" />
            安装
          </Button>
          <button
            onClick={() => setShowSettings(true)}
            className="rounded-md p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {showMarket ? (
        <div className="flex-1 overflow-hidden">
          <MarketPanel
            onInstallClick={handleInstallClick}
            onInstallSuccess={() => setRefreshKey((k) => k + 1)}
            onClose={() => setShowMarket(false)}
          />
        </div>
      ) : (
        <main className="flex flex-1 overflow-hidden">
          <div className="w-[380px] shrink-0 overflow-auto border-r border-[var(--border)] p-3">
            <LocalView
              key={refreshKey}
              providerFilter={providerFilter}
              onSkillSelect={setSelectedSkill}
              selectedSkill={selectedSkill}
            />
          </div>
          <div className="flex-1 overflow-hidden">
            {selectedSkill ? (
              <div className="h-full p-4">
                <SkillDetailView
                  skill={selectedSkill}
                  onClose={() => setSelectedSkill(null)}
                  onUninstall={() => setPendingUninstall(selectedSkill)}
                />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-[var(--muted-foreground)]">
                选择 skill 查看详情
              </div>
            )}
          </div>
        </main>
      )}

      {/* Install confirm */}
      <ConfirmDialog
        open={pendingInstall !== null}
        onOpenChange={(open) => !open && setPendingInstall(null)}
        title={pendingInstall?.existingPaths.length ? "覆盖 skill" : "安装 skill"}
        description={
          <div className="space-y-2">
            <p>
              将 <strong>{pendingInstall?.skill.dirName}</strong> 安装到：
            </p>
            <code className="block rounded bg-[var(--secondary)] px-2 py-1 text-xs text-[var(--muted-foreground)]">
              ~/.claude/skills/{pendingInstall?.skill.dirName}/
            </code>
            {!!pendingInstall?.existingPaths.length && (
              <p className="text-[var(--destructive)]">
                将删除目录及全部内容后重新写入，不可恢复
              </p>
            )}
            {(pendingInstall?.skill.hasHooks || pendingInstall?.skill.hasMcp) && (
              <p className="text-amber-400">
                该 skill 含 hooks/MCP，安装后将执行
              </p>
            )}
          </div>
        }
        confirmLabel={pendingInstall?.existingPaths.length ? "覆盖" : "安装"}
        destructive={!!pendingInstall?.existingPaths.length}
        loading={installLoading}
        success={installSuccess}
        successLabel="已安装"
        onConfirm={handleInstallConfirm}
      />

      {/* Uninstall confirm */}
      <ConfirmDialog
        open={pendingUninstall !== null}
        onOpenChange={(open) => !open && setPendingUninstall(null)}
        title="卸载 skill"
        description={
          <div className="space-y-2">
            <p>
              将卸载 <strong>{pendingUninstall?.dirName}</strong>：
            </p>
            <code className="block rounded bg-[var(--secondary)] px-2 py-1 text-xs text-[var(--muted-foreground)]">
              {pendingUninstall?.path}
            </code>
            <p className="text-[var(--destructive)]">
              将删除目录及全部内容，不可恢复
            </p>
          </div>
        }
        confirmLabel="卸载"
        destructive
        loading={uninstallLoading}
        success={uninstallSuccess}
        successLabel="已卸载"
        onConfirm={handleUninstallConfirm}
      />
    </div>
  );
}

export default App;
