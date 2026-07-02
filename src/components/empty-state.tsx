import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <Icon className="h-10 w-10 text-[var(--muted-foreground)]" />
      <h3 className="text-lg font-medium text-[var(--foreground)]">{title}</h3>
      <p className="max-w-sm text-center text-sm text-[var(--muted-foreground)]">
        {description}
      </p>
      {action}
    </div>
  );
}
