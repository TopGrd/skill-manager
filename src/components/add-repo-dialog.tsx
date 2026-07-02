import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AddRepoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (url: string) => Promise<void>;
}

export function AddRepoDialog({
  open,
  onOpenChange,
  onAdd,
}: AddRepoDialogProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await onAdd(url.trim());
      setUrl("");
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-[var(--border)] bg-[var(--card)] shadow-none">
        <DialogHeader>
          <DialogTitle className="text-[var(--foreground)]">
            添加仓库
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/owner/repo"
            className="border-[var(--border)] bg-[var(--input)] text-[var(--foreground)]"
          />
          {error && (
            <p className="mt-2 text-xs text-[var(--destructive)]">{error}</p>
          )}
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={loading || !url.trim()}>
              {loading ? "克隆中..." : "添加"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
