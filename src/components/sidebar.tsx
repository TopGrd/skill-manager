import { cn } from "@/lib/utils";
import type { ProviderFilter, ViewMode } from "@/lib/types";
import { Settings, Package, Store } from "lucide-react";

interface SidebarProps {
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  providerFilter: ProviderFilter;
  onProviderFilterChange: (filter: ProviderFilter) => void;
  onSettingsClick: () => void;
}

const PROVIDER_FILTERS: { value: ProviderFilter; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "claude-code", label: "Claude Code" },
  { value: "codex", label: "Codex" },
];

export function Sidebar({
  view,
  onViewChange,
  providerFilter,
  onProviderFilterChange,
  onSettingsClick,
}: SidebarProps) {
  return (
    <aside className="flex h-screen w-60 flex-col border-r border-[var(--border)] bg-[var(--background)]">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-semibold text-[var(--foreground)]">
          Skill Manager
        </span>
        <button
          onClick={onSettingsClick}
          className="rounded-md p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 px-2 py-1">
        <NavItem
          icon={<Package className="h-4 w-4" />}
          label="本机"
          active={view === "local"}
          onClick={() => onViewChange("local")}
        />
        <NavItem
          icon={<Store className="h-4 w-4" />}
          label="市场"
          active={view === "market"}
          onClick={() => onViewChange("market")}
        />

        {view === "local" && (
          <div className="mt-3 flex gap-1 px-1">
            {PROVIDER_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => onProviderFilterChange(f.value)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs transition-colors",
                  providerFilter === f.value
                    ? "bg-[var(--muted)] text-[var(--foreground)]"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--secondary)]"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </nav>
    </aside>
  );
}

function NavItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
        active
          ? "bg-[var(--muted)] text-[var(--foreground)]"
          : "text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
