use crate::clawhub;
use crate::github_import;
use crate::installer;
use crate::provider::Provider;
use crate::repo::{self, Repo};
use crate::scanner::{
    build_file_tree, read_file_content, scan_all, scan_provider, FileContent, FileNode,
};
use crate::skill::Skill;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallRequest {
    pub source_path: String,
    pub providers: Vec<Provider>,
    pub repo_url: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSkillRequest {
    pub name: String,
    pub description: String,
    pub content: String,
    pub provider: Provider,
}

#[tauri::command]
pub fn get_skills(provider: Option<Provider>, extra_dirs: Vec<PathBuf>) -> Vec<Skill> {
    match provider {
        Some(p) => scan_provider(p),
        None => scan_all(&extra_dirs),
    }
}

#[tauri::command]
pub fn get_file_tree(path: String) -> Result<FileNode, String> {
    let p = PathBuf::from(path);
    build_file_tree(&p).ok_or_else(|| "Failed to build file tree".to_string())
}

#[tauri::command]
pub fn get_file_content(path: String) -> Result<FileContent, String> {
    read_file_content(&PathBuf::from(path))
}

#[tauri::command]
pub fn get_scan_roots() -> Vec<ScanRootInfo> {
    Provider::all()
        .iter()
        .map(|p| ScanRootInfo {
            provider: *p,
            path: p.scan_root(),
            exists: p.scan_root().is_dir(),
        })
        .collect()
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanRootInfo {
    pub provider: Provider,
    pub path: PathBuf,
    pub exists: bool,
}

#[tauri::command]
pub async fn add_repo(url: String) -> Result<Repo, String> {
    let (tx, rx) = std::sync::mpsc::channel();
    std::thread::spawn(move || {
        tx.send(repo::add_repo(&url)).ok();
    });
    rx.recv().map_err(|e| format!("Thread failed: {}", e))?
}

#[tauri::command]
pub async fn refresh_repo(url: String) -> Result<Repo, String> {
    let (tx, rx) = std::sync::mpsc::channel();
    std::thread::spawn(move || {
        tx.send(repo::add_repo(&url)).ok();
    });
    rx.recv().map_err(|e| format!("Thread failed: {}", e))?
}

#[tauri::command]
pub fn get_cache_size() -> Result<u64, String> {
    repo::get_cache_size()
}

#[tauri::command]
pub fn clear_cache() -> Result<(), String> {
    repo::clear_cache()
}

#[tauri::command]
pub fn remove_repo_cache(url: String) -> Result<(), String> {
    repo::remove_repo_cache(&url)
}

#[tauri::command]
pub fn install_skill(req: InstallRequest) -> Result<installer::InstallResult, String> {
    installer::install_skill(
        &PathBuf::from(&req.source_path),
        &req.providers,
        req.repo_url.as_deref(),
    )
}

#[tauri::command]
pub fn uninstall_skill(path: String) -> Result<(), String> {
    installer::uninstall_skill(&PathBuf::from(path))
}

#[tauri::command]
pub fn check_existing(dir_name: String, providers: Vec<Provider>) -> Vec<PathBuf> {
    installer::check_existing(&dir_name, &providers)
}

#[tauri::command]
pub fn reveal_in_finder(path: String) -> Result<(), String> {
    std::process::Command::new("open")
        .arg(&path)
        .spawn()
        .map_err(|e| format!("Failed to open Finder: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn open_in_vscode(path: String) -> Result<(), String> {
    std::process::Command::new("code")
        .arg(&path)
        .spawn()
        .map_err(|e| format!("Failed to open VS Code: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn clawhub_search(query: String) -> Result<Vec<clawhub::ClawHubSearchResult>, String> {
    clawhub::search_skills(&query).await
}

#[tauri::command]
pub async fn clawhub_list(sort: String, limit: u32) -> Result<Vec<clawhub::ClawHubSkill>, String> {
    clawhub::list_skills(&sort, limit).await
}

#[tauri::command]
pub async fn clawhub_detail(slug: String) -> Result<clawhub::ClawHubSkill, String> {
    clawhub::get_skill_detail(&slug).await
}

#[tauri::command]
pub async fn clawhub_install(slug: String, provider: Provider) -> Result<String, String> {
    let target_root = provider.install_root();
    std::fs::create_dir_all(&target_root).map_err(|e| e.to_string())?;
    let installed = clawhub::download_and_extract(&slug, &target_root).await?;
    Ok(installed.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn github_import_skill(url: String, provider: Provider) -> Result<String, String> {
    let target_root = provider.install_root();
    std::fs::create_dir_all(&target_root).map_err(|e| e.to_string())?;
    let installed = github_import::import_skill(&url, &target_root).await?;
    Ok(installed.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn github_preview_skill(url: String) -> Result<String, String> {
    github_import::preview_skill(&url).await
}

#[tauri::command]
pub fn create_skill(req: CreateSkillRequest) -> Result<String, String> {
    let path = installer::create_skill(&req.name, &req.description, &req.content, &req.provider)?;
    Ok(path.to_string_lossy().to_string())
}
