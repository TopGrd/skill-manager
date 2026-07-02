export type Provider = "claude-code" | "codex";

export interface Skill {
  provider: Provider;
  dirName: string;
  path: string;
  name: string | null;
  description: string | null;
  valid: boolean;
  source: SkillSource;
  hasHooks: boolean;
  hasMcp: boolean;
  hasPlugin: boolean;
}

export type SkillSource = { type: "local" } | { type: "repo"; url: string };

export interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  children: FileNode[];
  size: number;
  isBinary: boolean;
}

export interface FileContent {
  content: string;
  truncated: boolean;
  isBinary: boolean;
  size: number;
  language: string | null;
}

export interface ScanRootInfo {
  provider: Provider;
  path: string;
  exists: boolean;
}

export interface Repo {
  url: string;
  owner: string;
  name: string;
  localPath: string;
  skills: Skill[];
}

export interface RepoSkill {
  dirName: string;
  name: string | null;
  description: string | null;
  valid: boolean;
  relativePath: string;
  hasHooks: boolean;
  hasMcp: boolean;
  hasPlugin: boolean;
}

export interface InstallResult {
  installedPaths: string[];
  skills: Skill[];
}

export interface InstallRequest {
  sourcePath: string;
  providers: Provider[];
  repoUrl?: string;
}

export type ViewMode = "local" | "market";
export type ProviderFilter = Provider | "all";

export interface ClawHubSkill {
  slug: string;
  displayName: string | null;
  summary: string | null;
  description: string | null;
  topics: string[];
  license: string | null;
  stats: { downloads?: number; installs?: number; stars?: number } | null;
  latestVersion: { version?: string; changelog?: string } | null;
}

export interface ClawHubSearchResult {
  slug: string;
  displayName: string | null;
  summary: string | null;
  ownerHandle: string | null;
  score: number | null;
  downloads: number | null;
}

export interface CreateSkillRequest {
  name: string;
  description: string;
  content: string;
  provider: Provider;
}
