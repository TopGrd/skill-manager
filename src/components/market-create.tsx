import { useState } from "react";
import { Check, FilePlus, Loader2 } from "lucide-react";
import { createSkill } from "@/lib/commands";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Provider } from "@/lib/types";

interface MarketCreateProps {
  targetProvider: Provider;
  onInstallSuccess: () => void;
}

export function MarketCreate({ targetProvider, onInstallSuccess }: MarketCreateProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim() || !description.trim()) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const path = await createSkill({
        name: name.trim(),
        description: description.trim(),
        content: content.trim(),
        provider: targetProvider,
      });
      setSuccess(path);
      setName("");
      setDescription("");
      setContent("");
      onInstallSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
        <FilePlus className="h-4 w-4" />
        创建新 skill 并安装到 Claude Code
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-[var(--muted-foreground)]">
            名称 *
          </label>
          <Input
            value={name}
            onChange={(e) => { setName(e.target.value); setError(null); setSuccess(null); }}
            placeholder="my-skill"
            className="border-[var(--border)] bg-[var(--input)] text-sm text-[var(--foreground)]"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-[var(--muted-foreground)]">
            描述 *
          </label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A brief description of what this skill does"
            className="border-[var(--border)] bg-[var(--input)] text-sm text-[var(--foreground)]"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-[var(--muted-foreground)]">
            SKILL.md 内容（可选，留空则自动生成）
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={"Skill 的完整指令内容...\n\n例如：\n## 何时使用\n当用户需要...\n\n## 步骤\n1. ..."}
            rows={10}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--input)] px-3 py-2 font-mono text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--ring)]"
            style={{ fontFamily: "'SF Mono', monospace" }}
          />
        </div>

        {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}

        {success && (
          <div className="flex items-center gap-1.5 text-xs text-green-400">
            <Check className="h-3.5 w-3.5" />
            已创建到 {success}
          </div>
        )}

        <Button
          onClick={handleCreate}
          disabled={loading || !name.trim() || !description.trim()}
          className="w-full"
        >
          {loading ? (
            <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />创建中...</>
          ) : (
            "创建 Skill"
          )}
        </Button>
      </div>
    </div>
  );
}
