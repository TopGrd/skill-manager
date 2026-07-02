import { cn } from "@/lib/utils";
import type { Skill } from "@/lib/types";

interface SkillListItemProps {
  skill: Skill;
  selected: boolean;
  onClick: () => void;
}

export function SkillListItem({ skill, selected, onClick }: SkillListItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors",
        selected
          ? "border-[var(--destructive)] bg-[var(--muted)]"
          : "border-[var(--border)] bg-[var(--card)] hover:bg-[var(--secondary)]"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-[var(--foreground)]">
            {skill.dirName}
          </span>
          {!skill.valid && (
            <span className="shrink-0 text-xs text-[var(--destructive)]">
              invalid
            </span>
          )}
        </div>
        {skill.description && (
          <p className="mt-1 truncate text-xs text-[var(--muted-foreground)]">
            {skill.description}
          </p>
        )}
      </div>
      <span className="ml-3 shrink-0 rounded-full bg-[var(--secondary)] px-2 py-0.5 text-xs text-[var(--muted-foreground)]">
        {skill.provider === "claude-code" ? "Claude Code" : "Codex"}
      </span>
    </button>
  );
}
