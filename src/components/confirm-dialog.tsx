import { Loader2, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  loading?: boolean;
  success?: boolean;
  successLabel?: string;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive = false,
  loading = false,
  success = false,
  successLabel = "完成",
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-[var(--border)] bg-[var(--card)] shadow-none">
        <DialogHeader>
          <DialogTitle className="text-[var(--foreground)]">
            {title}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="text-sm text-[var(--muted-foreground)]">
              {description}
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            autoFocus={!success}
            disabled={loading || success}
          >
            取消
          </Button>
          <Button
            variant={success ? "secondary" : destructive ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={loading || success}
          >
            {success ? (
              <>
                <Check className="mr-1 h-3.5 w-3.5 text-green-400" />
                <span className="text-green-400">{successLabel}</span>
              </>
            ) : loading ? (
              <>
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                处理中...
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
