import { invoke } from "@tauri-apps/api/core";
import type {
  ClawHubSearchResult,
  ClawHubSkill,
  CreateSkillRequest,
  FileContent,
  FileNode,
  InstallRequest,
  InstallResult,
  Provider,
  Repo,
  ScanRootInfo,
  Skill,
} from "./types";

export async function getSkills(
  provider?: Provider,
  extraDirs: string[] = []
): Promise<Skill[]> {
  return invoke("get_skills", { provider: provider ?? null, extraDirs });
}

export async function getFileTree(path: string): Promise<FileNode> {
  return invoke("get_file_tree", { path });
}

export async function getFileContent(path: string): Promise<FileContent> {
  return invoke("get_file_content", { path });
}

export async function getScanRoots(): Promise<ScanRootInfo[]> {
  return invoke("get_scan_roots");
}

export async function addRepo(url: string): Promise<Repo> {
  return invoke("add_repo", { url });
}

export async function refreshRepo(url: string): Promise<Repo> {
  return invoke("refresh_repo", { url });
}

export async function getCacheSize(): Promise<number> {
  return invoke("get_cache_size");
}

export async function clearCache(): Promise<void> {
  return invoke("clear_cache");
}

export async function removeRepoCache(url: string): Promise<void> {
  return invoke("remove_repo_cache", { url });
}

export async function installSkill(req: InstallRequest): Promise<InstallResult> {
  return invoke("install_skill", { req });
}

export async function uninstallSkill(path: string): Promise<void> {
  return invoke("uninstall_skill", { path });
}

export async function checkExisting(
  dirName: string,
  providers: Provider[]
): Promise<string[]> {
  return invoke("check_existing", { dirName, providers });
}

export async function revealInFinder(path: string): Promise<void> {
  return invoke("reveal_in_finder", { path });
}

export async function openInVscode(path: string): Promise<void> {
  return invoke("open_in_vscode", { path });
}

export async function clawhubSearch(query: string): Promise<ClawHubSearchResult[]> {
  return invoke("clawhub_search", { query });
}

export async function clawhubList(
  sort: string = "trending",
  limit: number = 25
): Promise<ClawHubSkill[]> {
  return invoke("clawhub_list", { sort, limit });
}

export async function clawhubDetail(slug: string): Promise<ClawHubSkill> {
  return invoke("clawhub_detail", { slug });
}

export async function clawhubInstall(
  slug: string,
  provider: Provider
): Promise<string> {
  return invoke("clawhub_install", { slug, provider });
}

export async function githubPreviewSkill(url: string): Promise<string> {
  return invoke("github_preview_skill", { url });
}

export async function githubImportSkill(
  url: string,
  provider: Provider
): Promise<string> {
  return invoke("github_import_skill", { url, provider });
}

export async function createSkill(req: CreateSkillRequest): Promise<string> {
  return invoke("create_skill", { req });
}
