import { useEffect, useState } from "react";
import { X, MoreVertical, Trash2, FolderOpen, Code } from "lucide-react";
import { getFileTree, revealInFinder, openInVscode } from "@/lib/commands";
import { DirectoryTree } from "@/components/directory-tree";
import { FileViewer } from "@/components/file-viewer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FileNode, Skill } from "@/lib/types";

interface SkillDetailViewProps {
  skill: Skill;
  onClose: () => void;
  onUninstall?: () => void;
}

export function SkillDetailView({ skill, onClose, onUninstall }: SkillDetailViewProps) {
  const [tree, setTree] = useState<FileNode | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setSelectedFile(null);
    getFileTree(skill.path)
      .then((t) => {
        setTree(t);
        const skillMd = findFile(t, "SKILL.md");
        if (skillMd) setSelectedFile(skillMd);
      })
      .finally(() => setLoading(false));
  }, [skill.path]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2">
        <div className="min-w-0 flex-1">
          <span className="text-sm font-medium text-[var(--foreground)]">
            {skill.dirName}
          </span>
          <span className="ml-2 text-xs text-[var(--muted-foreground)]">
            {skill.provider === "claude-code" ? "Claude Code" : "Codex"}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-md p-1 text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]">
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="min-w-[160px] border-[var(--border)] bg-[var(--card)] shadow-none"
            >
              <DropdownMenuItem
                className="gap-2 whitespace-nowrap text-xs text-[var(--muted-foreground)] focus:bg-[var(--secondary)] focus:text-[var(--foreground)]"
                onSelect={() => revealInFinder(skill.path)}
              >
                <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                在 Finder 中打开
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 whitespace-nowrap text-xs text-[var(--muted-foreground)] focus:bg-[var(--secondary)] focus:text-[var(--foreground)]"
                onSelect={() => openInVscode(skill.path)}
              >
                <Code className="h-3.5 w-3.5 shrink-0" />
                在 VS Code 中打开
              </DropdownMenuItem>
              {onUninstall && (
                <DropdownMenuItem
                  className="gap-2 whitespace-nowrap text-xs text-[var(--destructive)] focus:bg-[var(--secondary)] focus:text-[var(--destructive)]"
                  onSelect={onUninstall}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  卸载
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        {loading ? (
          <div className="flex-1 p-4">
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-5 animate-pulse rounded bg-[var(--secondary)]"
                  style={{ width: `${80 + (i % 3) * 5}%` }}
                />
              ))}
            </div>
          </div>
        ) : (
          <>
            {tree && (
              <DirectoryTree
                root={tree}
                selectedPath={selectedFile}
                onFileSelect={setSelectedFile}
              />
            )}
            {selectedFile ? (
              <FileViewer filePath={selectedFile} />
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-[var(--muted-foreground)]">
                选择文件查看内容
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function findFile(node: FileNode, name: string): string | null {
  if (!node.isDir && node.name === name) return node.path;
  for (const child of node.children) {
    const found = findFile(child, name);
    if (found) return found;
  }
  return null;
}
