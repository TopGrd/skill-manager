import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { MarketRepos } from "@/components/market-repos";
import { MarketClawHub } from "@/components/market-clawhub";
import { MarketCreate } from "@/components/market-create";
import type { Provider, Skill } from "@/lib/types";

type MarketTab = "clawhub" | "repos" | "create";

const TABS: { value: MarketTab; label: string }[] = [
  { value: "clawhub", label: "ClawHub" },
  { value: "repos", label: "仓库" },
  { value: "create", label: "创建" },
];

const PROVIDERS: { value: Provider; label: string }[] = [
  { value: "claude-code", label: "Claude Code" },
  { value: "codex", label: "Codex" },
];

interface MarketPanelProps {
  onInstallClick: (skill: Skill, repoUrl: string, sourcePath: string) => void;
  onInstallSuccess: () => void;
  onClose: () => void;
}

export function MarketPanel({ onInstallClick, onInstallSuccess, onClose }: MarketPanelProps) {
  const [tab, setTab] = useState<MarketTab>("clawhub");
  const [targetProvider, setTargetProvider] = useState<Provider>("claude-code");

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
        <div>
          <h2 className="text-base font-medium text-[var(--foreground)]">安装 Skill</h2>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex gap-1">
              {TABS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTab(t.value)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs transition-colors",
                    tab === t.value
                      ? "bg-[var(--muted)] font-medium text-[var(--foreground)]"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="h-4 w-px bg-[var(--border)]" />
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[var(--muted-foreground)]">安装到</span>
              <div className="flex gap-0.5 rounded-md bg-[var(--card)] p-0.5">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setTargetProvider(p.value)}
                    className={cn(
                      "rounded px-2 py-0.5 text-xs transition-colors",
                      targetProvider === p.value
                        ? "bg-[var(--muted)] font-medium text-[var(--foreground)]"
                        : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-5">
        {tab === "clawhub" && <MarketClawHub targetProvider={targetProvider} onInstallSuccess={onInstallSuccess} />}
        {tab === "repos" && <MarketRepos onInstallClick={onInstallClick} />}
        {tab === "create" && <MarketCreate targetProvider={targetProvider} onInstallSuccess={onInstallSuccess} />}
      </div>
    </div>
  );
}
