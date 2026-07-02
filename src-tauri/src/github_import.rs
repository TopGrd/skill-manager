use serde::Deserialize;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Deserialize)]
struct GitHubContent {
    name: String,
    path: String,
    #[serde(rename = "type")]
    content_type: String,
    download_url: Option<String>,
}

pub struct ParsedGitHubUrl {
    pub owner: String,
    pub repo: String,
    pub branch: String,
    pub path: String,
}

pub fn parse_github_url(url: &str) -> Result<ParsedGitHubUrl, String> {
    let cleaned = url.trim().trim_end_matches('/');

    // https://github.com/owner/repo/tree/branch/path/to/skill
    if let Some(rest) = cleaned
        .strip_prefix("https://github.com/")
        .or_else(|| cleaned.strip_prefix("http://github.com/"))
    {
        let parts: Vec<&str> = rest.splitn(5, '/').collect();
        // owner/repo/tree/branch/path
        if parts.len() >= 5 && parts[2] == "tree" {
            return Ok(ParsedGitHubUrl {
                owner: parts[0].to_string(),
                repo: parts[1].to_string(),
                branch: parts[3].to_string(),
                path: parts[4].to_string(),
            });
        }
        // owner/repo (root of default branch)
        if parts.len() >= 2 {
            return Ok(ParsedGitHubUrl {
                owner: parts[0].to_string(),
                repo: parts[1].to_string(),
                branch: "main".to_string(),
                path: String::new(),
            });
        }
    }

    Err(format!("Cannot parse GitHub URL: {}", url))
}

pub async fn import_skill(url: &str, target_dir: &Path) -> Result<PathBuf, String> {
    let parsed = parse_github_url(url)?;

    let api_url = if parsed.path.is_empty() {
        format!(
            "https://api.github.com/repos/{}/{}/contents?ref={}",
            parsed.owner, parsed.repo, parsed.branch
        )
    } else {
        format!(
            "https://api.github.com/repos/{}/{}/contents/{}?ref={}",
            parsed.owner, parsed.repo, parsed.path, parsed.branch
        )
    };

    let skill_name = if parsed.path.is_empty() {
        parsed.repo.clone()
    } else {
        parsed.path.split('/').last().unwrap_or(&parsed.repo).to_string()
    };

    let dest = target_dir.join(&skill_name);
    if dest.exists() {
        fs::remove_dir_all(&dest).map_err(|e| e.to_string())?;
    }
    fs::create_dir_all(&dest).map_err(|e| e.to_string())?;

    download_directory(&api_url, &dest).await?;

    if !dest.join("SKILL.md").is_file() {
        // Check one level deep
        let mut found = false;
        if let Ok(entries) = fs::read_dir(&dest) {
            for entry in entries.flatten() {
                if entry.path().is_dir() && entry.path().join("SKILL.md").is_file() {
                    found = true;
                    break;
                }
            }
        }
        if !found {
            let _ = fs::remove_dir_all(&dest);
            return Err("该路径下未找到 SKILL.md".to_string());
        }
    }

    Ok(dest)
}

fn download_directory<'a>(
    api_url: &'a str,
    dest: &'a Path,
) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<(), String>> + Send + 'a>> {
    Box::pin(async move {
        let client = reqwest::Client::new();
        let resp = client
            .get(api_url)
            .header("User-Agent", "skill-manager")
            .header("Accept", "application/vnd.github.v3+json")
            .send()
            .await
            .map_err(|e| format!("GitHub API request failed: {}", e))?;

        if !resp.status().is_success() {
            return Err(format!("GitHub API returned {}", resp.status()));
        }

        let contents: Vec<GitHubContent> = resp
            .json()
            .await
            .map_err(|e| format!("Parse GitHub response failed: {}", e))?;

        for item in &contents {
            let item_path = dest.join(&item.name);
            if item.content_type == "dir" {
                fs::create_dir_all(&item_path).map_err(|e| e.to_string())?;
                let dir_api = format!(
                    "https://api.github.com/repos/{}/contents/{}",
                    extract_repo_from_api_url(api_url),
                    item.path
                );
                download_directory(&dir_api, &item_path).await?;
            } else if let Some(download_url) = &item.download_url {
                let file_bytes = client
                    .get(download_url)
                    .header("User-Agent", "skill-manager")
                    .send()
                    .await
                    .map_err(|e| e.to_string())?
                    .bytes()
                    .await
                    .map_err(|e| e.to_string())?;
                fs::write(&item_path, &file_bytes).map_err(|e| e.to_string())?;
            }
        }

        Ok(())
    })
}

fn extract_repo_from_api_url(url: &str) -> String {
    // https://api.github.com/repos/owner/repo/contents/... → owner/repo
    url.strip_prefix("https://api.github.com/repos/")
        .unwrap_or("")
        .split("/contents")
        .next()
        .unwrap_or("")
        .to_string()
}

pub async fn preview_skill(url: &str) -> Result<String, String> {
    let parsed = parse_github_url(url)?;

    let skill_md_path = if parsed.path.is_empty() {
        "SKILL.md".to_string()
    } else {
        format!("{}/SKILL.md", parsed.path)
    };

    let raw_url = format!(
        "https://raw.githubusercontent.com/{}/{}/{}/{}",
        parsed.owner, parsed.repo, parsed.branch, skill_md_path
    );

    let client = reqwest::Client::new();
    let resp = client
        .get(&raw_url)
        .header("User-Agent", "skill-manager")
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("未找到 SKILL.md（HTTP {}）", resp.status()));
    }

    resp.text()
        .await
        .map_err(|e| format!("Read failed: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_full_github_url() {
        let p = parse_github_url(
            "https://github.com/anthropics/skills/tree/main/skills/my-skill",
        )
        .unwrap();
        assert_eq!(p.owner, "anthropics");
        assert_eq!(p.repo, "skills");
        assert_eq!(p.branch, "main");
        assert_eq!(p.path, "skills/my-skill");
    }

    #[test]
    fn parse_repo_root_url() {
        let p = parse_github_url("https://github.com/owner/repo").unwrap();
        assert_eq!(p.owner, "owner");
        assert_eq!(p.repo, "repo");
        assert_eq!(p.branch, "main");
        assert!(p.path.is_empty());
    }

    #[test]
    fn parse_invalid_url_fails() {
        assert!(parse_github_url("not-a-github-url").is_err());
    }

    #[test]
    fn extract_repo_from_api() {
        assert_eq!(
            extract_repo_from_api_url(
                "https://api.github.com/repos/anthropics/skills/contents/foo"
            ),
            "anthropics/skills"
        );
    }
}
