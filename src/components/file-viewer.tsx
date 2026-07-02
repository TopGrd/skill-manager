import { useEffect, useRef, useState } from "react";
import { getFileContent } from "@/lib/commands";
import type { FileContent } from "@/lib/types";

interface FileViewerProps {
  filePath: string;
}

export function FileViewer({ filePath }: FileViewerProps) {
  const [content, setContent] = useState<FileContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"preview" | "source">("preview");

  const isMarkdown =
    filePath.endsWith(".md") || filePath.endsWith(".markdown");

  useEffect(() => {
    setLoading(true);
    setError(null);
    setViewMode("preview");
    getFileContent(filePath)
      .then(setContent)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [filePath]);

  if (loading) {
    return (
      <div className="flex-1 p-4">
        <div className="h-4 w-48 animate-pulse rounded bg-[var(--secondary)]" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-4 animate-pulse rounded bg-[var(--secondary)]"
              style={{ width: `${60 + (i % 4) * 10}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-4 text-sm text-[var(--destructive)]">
        {error}
      </div>
    );
  }

  if (!content) return null;

  const relativePath = filePath.split("/").slice(-2).join("/");

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2">
        <span className="text-xs text-[var(--muted-foreground)]">
          {relativePath}
        </span>
        {isMarkdown && (
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode("preview")}
              className={`rounded px-2 py-0.5 text-xs ${
                viewMode === "preview"
                  ? "bg-[var(--muted)] text-[var(--foreground)]"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--secondary)]"
              }`}
            >
              预览
            </button>
            <button
              onClick={() => setViewMode("source")}
              className={`rounded px-2 py-0.5 text-xs ${
                viewMode === "source"
                  ? "bg-[var(--muted)] text-[var(--foreground)]"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--secondary)]"
              }`}
            >
              源码
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4">
        {content.isBinary ? (
          <div className="text-sm text-[var(--muted-foreground)]">
            二进制文件（{formatSize(content.size)}）
          </div>
        ) : content.truncated ? (
          <div>
            <div className="mb-2 text-xs text-[var(--muted-foreground)]">
              文件过大（{formatSize(content.size)}），仅显示前 10,000 字符
            </div>
            <CodeBlock content={content.content} language={content.language} />
          </div>
        ) : isMarkdown && viewMode === "preview" ? (
          <MarkdownPreview content={content.content} />
        ) : (
          <CodeBlock content={content.content} language={content.language} />
        )}
      </div>
    </div>
  );
}

function CodeBlock({
  content,
  language,
}: {
  content: string;
  language: string | null;
}) {
  const ref = useRef<HTMLPreElement>(null);
  const [highlighted, setHighlighted] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("shiki").then(async ({ createHighlighter }) => {
      const lang = language ?? "text";
      try {
        const highlighter = await createHighlighter({
          themes: ["github-dark"],
          langs: [lang],
        });
        if (!cancelled) {
          const html = highlighter.codeToHtml(content, {
            lang,
            theme: "github-dark",
          });
          setHighlighted(html);
        }
      } catch {
        // language not supported, show plain
      }
    });
    return () => {
      cancelled = true;
    };
  }, [content, language]);

  if (highlighted) {
    return (
      <div
        className="text-sm [&_pre]:bg-transparent [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_code]:text-sm [&_code]:whitespace-pre-wrap [&_code]:break-words"
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
    );
  }

  return (
    <pre
      ref={ref}
      className="whitespace-pre-wrap font-mono text-sm text-[var(--foreground)]"
    >
      {content}
    </pre>
  );
}

function stripFrontmatter(text: string): string {
  const trimmed = text.trimStart();
  if (!trimmed.startsWith("---")) return text;
  const end = trimmed.indexOf("\n---", 3);
  if (end === -1) return text;
  return trimmed.slice(end + 4).trimStart();
}

function MarkdownPreview({ content }: { content: string }) {
  const [html, setHtml] = useState("");

  useEffect(() => {
    import("markdown-it").then(({ default: MarkdownIt }) => {
      const md = new MarkdownIt({ html: false, linkify: true });
      const body = stripFrontmatter(content);
      setHtml(md.render(body));
    });
  }, [content]);

  return (
    <div
      className="prose prose-invert max-w-none prose-headings:text-[var(--foreground)] prose-p:text-[var(--foreground)] prose-a:text-[var(--foreground)] prose-a:underline prose-strong:text-[var(--foreground)] prose-code:rounded prose-code:bg-[var(--secondary)] prose-code:px-1 prose-code:py-0.5 prose-code:text-[var(--foreground)] prose-pre:bg-[var(--secondary)] prose-pre:p-3 prose-li:text-[var(--foreground)] prose-th:text-[var(--foreground)] prose-td:text-[var(--muted-foreground)] prose-table:text-sm prose-hr:border-[var(--border)] prose-blockquote:border-[var(--border)] prose-blockquote:text-[var(--muted-foreground)]"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
