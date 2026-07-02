import { useEffect, useState } from "react";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { getFileContent } from "@/lib/commands";
import { Button } from "@/components/ui/button";
import type { FileContent } from "@/lib/types";

interface SkillPreviewProps {
  name: string;
  description: string | null;
  extra?: string | null;
  skillMdPath?: string | null;
  skillMdContent?: string | null;
  installing: boolean;
  installed: boolean;
  onInstall: () => void;
  onBack: () => void;
}

function stripFrontmatter(text: string): string {
  const trimmed = text.trimStart();
  if (!trimmed.startsWith("---")) return text;
  const end = trimmed.indexOf("\n---", 3);
  if (end === -1) return text;
  return trimmed.slice(end + 4).trimStart();
}

export function SkillPreview({
  name,
  description,
  extra,
  skillMdPath,
  skillMdContent: initialContent,
  installing,
  installed,
  onInstall,
  onBack,
}: SkillPreviewProps) {
  const [content, setContent] = useState<string | null>(initialContent ?? null);
  const [loading, setLoading] = useState(false);
  const [html, setHtml] = useState("");

  useEffect(() => {
    if (initialContent) {
      setContent(initialContent);
      return;
    }
    if (!skillMdPath) return;
    setLoading(true);
    getFileContent(skillMdPath)
      .then((fc: FileContent) => setContent(fc.content))
      .catch(() => setContent(null))
      .finally(() => setLoading(false));
  }, [skillMdPath, initialContent]);

  useEffect(() => {
    if (!content) {
      setHtml("");
      return;
    }
    import("markdown-it").then(({ default: MarkdownIt }) => {
      const md = new MarkdownIt({ html: false, linkify: true });
      const body = stripFrontmatter(content);
      setHtml(md.render(body));
    });
  }, [content]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          返回
        </button>
        <Button
          variant="secondary"
          size="sm"
          disabled={installing || installed}
          onClick={onInstall}
        >
          {installed ? (
            <>
              <Check className="mr-1 h-3 w-3 text-green-400" />
              <span className="text-green-400">已安装</span>
            </>
          ) : installing ? (
            <>
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              安装中
            </>
          ) : (
            "安装"
          )}
        </Button>
      </div>

      <div className="mt-3 mb-3">
        <h3 className="text-base font-medium text-[var(--foreground)]">{name}</h3>
        {description && (
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">{description}</p>
        )}
        {extra && (
          <p className="mt-0.5 text-xs text-[var(--muted-foreground)] opacity-60">{extra}</p>
        )}
      </div>

      <div className="flex-1 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-4 animate-pulse rounded bg-[var(--secondary)]"
                style={{ width: `${50 + (i % 4) * 12}%` }}
              />
            ))}
          </div>
        ) : html ? (
          <div
            className="prose prose-invert max-w-none text-sm prose-headings:text-[var(--foreground)] prose-p:text-[var(--foreground)] prose-a:text-[var(--foreground)] prose-a:underline prose-strong:text-[var(--foreground)] prose-code:rounded prose-code:bg-[var(--secondary)] prose-code:px-1 prose-code:py-0.5 prose-code:text-[var(--foreground)] prose-pre:bg-[var(--secondary)] prose-pre:p-3 prose-pre:whitespace-pre-wrap prose-li:text-[var(--foreground)] prose-th:text-[var(--foreground)] prose-td:text-[var(--muted-foreground)] prose-hr:border-[var(--border)] prose-blockquote:border-[var(--border)] prose-blockquote:text-[var(--muted-foreground)]"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <p className="text-sm text-[var(--muted-foreground)]">无法加载 SKILL.md 内容</p>
        )}
      </div>
    </div>
  );
}
