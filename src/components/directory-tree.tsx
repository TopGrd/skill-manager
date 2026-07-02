import { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  FileCode,
  File,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FileNode } from "@/lib/types";

interface DirectoryTreeProps {
  root: FileNode;
  selectedPath: string | null;
  onFileSelect: (path: string) => void;
}

const CODE_EXTENSIONS = new Set([
  "ts", "tsx", "js", "jsx", "rs", "py", "go", "java", "rb", "swift",
  "kt", "c", "cpp", "h", "hpp", "sh", "bash", "zsh",
]);

function getFileIcon(name: string, isDir: boolean, isOpen: boolean) {
  if (isDir) {
    return isOpen ? (
      <FolderOpen className="h-4 w-4 text-[var(--muted-foreground)]" />
    ) : (
      <Folder className="h-4 w-4 text-[var(--muted-foreground)]" />
    );
  }
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "json" || ext === "toml" || ext === "yaml" || ext === "yml") {
    return <FileCode className="h-4 w-4 text-[var(--muted-foreground)]" />;
  }
  if (CODE_EXTENSIONS.has(ext)) {
    return <FileCode className="h-4 w-4 text-[var(--muted-foreground)]" />;
  }
  if (ext === "md" || ext === "txt" || ext === "markdown") {
    return <FileText className="h-4 w-4 text-[var(--muted-foreground)]" />;
  }
  return <File className="h-4 w-4 text-[var(--muted-foreground)]" />;
}

export function DirectoryTree({
  root,
  selectedPath,
  onFileSelect,
}: DirectoryTreeProps) {
  return (
    <div className="min-w-[200px] overflow-auto border-r border-[var(--border)] bg-[var(--card)] p-2">
      <TreeNode
        node={root}
        depth={0}
        selectedPath={selectedPath}
        onFileSelect={onFileSelect}
        defaultOpen
      />
    </div>
  );
}

function TreeNode({
  node,
  depth,
  selectedPath,
  onFileSelect,
  defaultOpen = false,
}: {
  node: FileNode;
  depth: number;
  selectedPath: string | null;
  onFileSelect: (path: string) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const isSelected = node.path === selectedPath;

  const sortedChildren = [...node.children].sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const handleClick = () => {
    if (node.isDir) {
      setOpen(!open);
    } else {
      onFileSelect(node.path);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className={cn(
          "flex w-full items-center gap-1 rounded-sm px-1 py-0.5 text-left text-sm",
          isSelected
            ? "bg-[var(--muted)] text-[var(--foreground)]"
            : "text-[var(--foreground)] hover:bg-[var(--secondary)]"
        )}
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
      >
        {node.isDir && (
          open ? (
            <ChevronDown className="h-3 w-3 shrink-0 text-[var(--muted-foreground)]" />
          ) : (
            <ChevronRight className="h-3 w-3 shrink-0 text-[var(--muted-foreground)]" />
          )
        )}
        {!node.isDir && <span className="w-3" />}
        {getFileIcon(node.name, node.isDir, open)}
        <span className="truncate">{node.name}</span>
      </button>
      {node.isDir && open && (
        <div>
          {sortedChildren.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onFileSelect={onFileSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
