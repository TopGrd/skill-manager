import { useEffect, useState } from "react";
import { Trash2, Plus, HardDrive } from "lucide-react";
import { getCacheSize, clearCache } from "@/lib/commands";
import { useSettings } from "@/hooks/use-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/confirm-dialog";

export function SettingsView() {
  const { settings, addExtraDir, removeExtraDir } = useSettings();
  const [cacheSize, setCacheSize] = useState<number | null>(null);
  const [newDir, setNewDir] = useState("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    getCacheSize().then(setCacheSize).catch(console.error);
  }, []);

  const handleClearCache = async () => {
    setClearing(true);
    try {
      await clearCache();
      setCacheSize(0);
      setShowClearConfirm(false);
    } catch (e) {
      console.error(e);
    } finally {
      setClearing(false);
    }
  };

  const handleAddDir = () => {
    if (newDir.trim()) {
      addExtraDir(newDir.trim());
      setNewDir("");
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-8 py-4">
      <h2 className="text-lg font-medium text-[var(--foreground)]">设置</h2>

      <section className="space-y-3">
        <h3 className="text-sm font-medium text-[var(--foreground)]">
          额外扫描目录
        </h3>
        <p className="text-xs text-[var(--muted-foreground)]">
          除 provider 默认路径外，额外扫描的目录
        </p>

        {settings.extraDirs.map((dir) => (
          <div
            key={dir}
            className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2"
          >
            <code className="text-xs text-[var(--muted-foreground)]">
              {dir}
            </code>
            <button
              onClick={() => removeExtraDir(dir)}
              className="text-[var(--muted-foreground)] hover:text-[var(--destructive)]"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}

        <div className="flex gap-2">
          <Input
            value={newDir}
            onChange={(e) => setNewDir(e.target.value)}
            placeholder="/path/to/skills"
            onKeyDown={(e) => e.key === "Enter" && handleAddDir()}
            className="border-[var(--border)] bg-[var(--input)] text-sm text-[var(--foreground)]"
          />
          <Button variant="secondary" size="sm" onClick={handleAddDir}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium text-[var(--foreground)]">
          仓库缓存
        </h3>
        <div className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--card)] px-4 py-3">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-[var(--muted-foreground)]" />
            <span className="text-sm text-[var(--foreground)]">
              缓存占用：
              {cacheSize !== null ? formatSize(cacheSize) : "计算中..."}
            </span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowClearConfirm(true)}
          >
            清理缓存
          </Button>
        </div>
        <p className="text-xs text-[var(--muted-foreground)]">
          缓存路径：~/.skills-manager/repos/
        </p>
      </section>

      <ConfirmDialog
        open={showClearConfirm}
        onOpenChange={setShowClearConfirm}
        title="清理仓库缓存"
        description="将删除所有已缓存的仓库克隆。下次访问市场时需重新克隆。"
        confirmLabel="清理"
        destructive
        loading={clearing}
        onConfirm={handleClearCache}
      />
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
