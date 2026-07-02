import { useState } from "react";
import { GitBranch, Loader2 } from "lucide-react";
import { githubImportSkill, githubPreviewSkill } from "@/lib/commands";
import { SkillPreview } from "@/components/skill-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Provider } from "@/lib/types";

interface MarketGitHubProps {
  targetProvider: Provider;
  onInstallSuccess: () => void;
}

export function MarketGitHub({ targetProvider, onInstallSuccess }: MarketGitHubProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Preview state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Install state
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);

  const handlePreview = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setError(null);
    setPreviewLoading(true);
    setPreviewContent(null);
    try {
      const content = await githubPreviewSkill(trimmed);
      setPreviewUrl(trimmed);
      setPreviewContent(content);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleInstall = async () => {
    const target = previewUrl || url.trim();
    if (!target) return;
    setInstalling(true);
    try {
      await githubImportSkill(target, targetProvider);
      setInstalled(true);
      onInstallSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setInstalling(false);
    }
  };

  // Show preview
  if (previewUrl && previewContent !== null) {
    const skillName = previewUrl.split("/").pop() || "skill";
    return (
      <SkillPreview
        name={skillName}
        description={null}
        extra={previewUrl}
        skillMdContent={previewContent}
        installing={installing}
        installed={installed}
        onInstall={handleInstall}
        onBack={() => {
          setPreviewUrl(null);
          setPreviewContent(null);
          setInstalled(false);
        }}
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
        <GitBranch className="h-4 w-4" />
        粘贴 GitHub URL，预览 SKILL.md 后安装
      </div>

      <div className="space-y-3">
        <Input
          value={url}
          onChange={(e) => { setUrl(e.target.value); setError(null); }}
          placeholder="https://github.com/owner/repo/tree/main/skills/my-skill"
          onKeyDown={(e) => e.key === "Enter" && handlePreview()}
          className="border-[var(--border)] bg-[var(--input)] text-sm text-[var(--foreground)]"
        />

        <p className="text-xs text-[var(--muted-foreground)]">
          支持格式：仓库根目录、tree 路径（如 /tree/main/skills/my-skill）
        </p>

        {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}

        <Button
          onClick={handlePreview}
          disabled={previewLoading || !url.trim()}
          className="w-full"
        >
          {previewLoading ? (
            <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />加载预览...</>
          ) : (
            "预览"
          )}
        </Button>
      </div>

      <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
        <p className="mb-2 text-xs font-medium text-[var(--foreground)]">示例</p>
        <div className="space-y-1.5">
          {[
            "https://github.com/anthropics/skills/tree/main/skills/writing-plans",
            "https://github.com/anthropics/skills/tree/main/skills/test-driven-development",
          ].map((example) => (
            <button
              key={example}
              onClick={() => setUrl(example)}
              className="block w-full truncate rounded px-2 py-1 text-left text-xs text-[var(--muted-foreground)] transition-colors hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
