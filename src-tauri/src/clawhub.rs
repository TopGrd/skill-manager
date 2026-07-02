use serde::{Deserialize, Serialize};
use std::fs;
use std::io;
use std::path::{Path, PathBuf};

const API_BASE: &str = "https://clawhub.ai/api/v1";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct ClawHubSkill {
    pub slug: String,
    pub display_name: Option<String>,
    pub summary: Option<String>,
    pub description: Option<String>,
    pub topics: Vec<String>,
    pub license: Option<String>,
    pub stats: Option<ClawHubStats>,
    pub latest_version: Option<ClawHubVersion>,
}

impl Default for ClawHubSkill {
    fn default() -> Self {
        Self {
            slug: String::new(),
            display_name: None,
            summary: None,
            description: None,
            topics: Vec::new(),
            license: None,
            stats: None,
            latest_version: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClawHubStats {
    pub downloads: Option<u64>,
    pub installs: Option<u64>,
    pub stars: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClawHubVersion {
    pub version: Option<String>,
    pub changelog: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClawHubListResponse {
    pub items: Vec<ClawHubSkill>,
    pub next_cursor: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClawHubSearchResult {
    pub slug: String,
    pub display_name: Option<String>,
    pub summary: Option<String>,
    pub owner_handle: Option<String>,
    pub score: Option<f64>,
    pub downloads: Option<u64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClawHubSearchResponse {
    pub results: Vec<ClawHubSearchResult>,
}

pub async fn search_skills(query: &str) -> Result<Vec<ClawHubSearchResult>, String> {
    let url = format!("{}/search?q={}", API_BASE, urlencoding::encode(query));
    let resp = reqwest::get(&url)
        .await
        .map_err(|e| format!("Request failed: {}", e))?;
    let data: ClawHubSearchResponse = resp
        .json()
        .await
        .map_err(|e| format!("Parse failed: {}", e))?;
    Ok(data.results)
}

pub async fn list_skills(sort: &str, limit: u32) -> Result<Vec<ClawHubSkill>, String> {
    let url = format!("{}/skills?sort={}&limit={}", API_BASE, sort, limit);
    let resp = reqwest::get(&url)
        .await
        .map_err(|e| format!("Request failed: {}", e))?;
    let data: ClawHubListResponse = resp
        .json()
        .await
        .map_err(|e| format!("Parse failed: {}", e))?;
    Ok(data.items)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ClawHubDetailResponse {
    skill: ClawHubSkill,
}

pub async fn get_skill_detail(slug: &str) -> Result<ClawHubSkill, String> {
    let url = format!("{}/skills/{}", API_BASE, slug);
    let resp = reqwest::get(&url)
        .await
        .map_err(|e| format!("Request failed: {}", e))?;
    let data: ClawHubDetailResponse = resp
        .json()
        .await
        .map_err(|e| format!("Parse failed: {}", e))?;
    Ok(data.skill)
}

pub async fn download_and_extract(slug: &str, target_dir: &Path) -> Result<PathBuf, String> {
    let url = format!("{}/download?slug={}", API_BASE, slug);
    let resp = reqwest::get(&url)
        .await
        .map_err(|e| format!("Download failed: {}", e))?;

    let bytes = resp
        .bytes()
        .await
        .map_err(|e| format!("Read bytes failed: {}", e))?;

    let cache_dir = dirs::home_dir()
        .expect("no home dir")
        .join(".skills-manager")
        .join("downloads");
    fs::create_dir_all(&cache_dir).map_err(|e| e.to_string())?;

    let zip_path = cache_dir.join(format!("{}.zip", slug));
    fs::write(&zip_path, &bytes).map_err(|e| e.to_string())?;

    let file = fs::File::open(&zip_path).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| format!("Invalid ZIP: {}", e))?;

    let extract_dir = cache_dir.join(slug);
    if extract_dir.exists() {
        fs::remove_dir_all(&extract_dir).map_err(|e| e.to_string())?;
    }
    fs::create_dir_all(&extract_dir).map_err(|e| e.to_string())?;

    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;
        let out_path = extract_dir.join(entry.mangled_name());

        if entry.is_dir() {
            fs::create_dir_all(&out_path).map_err(|e| e.to_string())?;
        } else {
            if let Some(parent) = out_path.parent() {
                fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            let mut outfile = fs::File::create(&out_path).map_err(|e| e.to_string())?;
            io::copy(&mut entry, &mut outfile).map_err(|e| e.to_string())?;
        }
    }

    let _ = fs::remove_file(&zip_path);

    let skill_dir = find_skill_dir(&extract_dir).unwrap_or(extract_dir.clone());

    let target = target_dir.join(slug);
    if target.exists() {
        fs::remove_dir_all(&target).map_err(|e| e.to_string())?;
    }
    crate::installer::copy_dir_all(&skill_dir, &target)?;

    let _ = fs::remove_dir_all(&extract_dir);

    Ok(target)
}

fn find_skill_dir(dir: &Path) -> Option<PathBuf> {
    if dir.join("SKILL.md").is_file() {
        return Some(dir.to_path_buf());
    }
    for entry in fs::read_dir(dir).ok()?.flatten() {
        let path = entry.path();
        if path.is_dir() && path.join("SKILL.md").is_file() {
            return Some(path);
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn find_skill_dir_direct() {
        let tmp = tempfile::TempDir::new().unwrap();
        fs::write(tmp.path().join("SKILL.md"), "---\nname: t\n---\n").unwrap();
        assert_eq!(find_skill_dir(tmp.path()), Some(tmp.path().to_path_buf()));
    }

    #[test]
    fn find_skill_dir_nested() {
        let tmp = tempfile::TempDir::new().unwrap();
        let nested = tmp.path().join("inner");
        fs::create_dir_all(&nested).unwrap();
        fs::write(nested.join("SKILL.md"), "---\nname: t\n---\n").unwrap();
        assert_eq!(find_skill_dir(tmp.path()), Some(nested));
    }

    #[test]
    fn find_skill_dir_none() {
        let tmp = tempfile::TempDir::new().unwrap();
        assert_eq!(find_skill_dir(tmp.path()), None);
    }
}
