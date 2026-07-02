use crate::provider::Provider;
use crate::skill::parse_skill;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Repo {
    pub url: String,
    pub owner: String,
    pub name: String,
    pub local_path: PathBuf,
    pub skills: Vec<RepoSkill>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoSkill {
    pub dir_name: String,
    pub name: Option<String>,
    pub description: Option<String>,
    pub valid: bool,
    pub relative_path: String,
    pub has_hooks: bool,
    pub has_mcp: bool,
    pub has_plugin: bool,
}

fn cache_root() -> PathBuf {
    dirs::home_dir()
        .expect("cannot resolve home directory")
        .join(".skills-manager")
        .join("repos")
}

pub fn parse_git_url(url: &str) -> Result<(String, String), String> {
    let cleaned = url.trim_end_matches('/').trim_end_matches(".git");

    if let Some(rest) = cleaned.strip_prefix("https://") {
        let parts: Vec<&str> = rest.splitn(3, '/').collect();
        if parts.len() >= 3 {
            return Ok((parts[1].to_string(), parts[2].to_string()));
        }
    }

    if let Some(rest) = cleaned.strip_prefix("git@") {
        if let Some(path) = rest.split(':').nth(1) {
            let parts: Vec<&str> = path.splitn(2, '/').collect();
            if parts.len() == 2 {
                return Ok((parts[0].to_string(), parts[1].to_string()));
            }
        }
    }

    Err(format!("Cannot parse git URL: {}", url))
}

pub fn clone_or_pull(url: &str) -> Result<PathBuf, String> {
    let (owner, name) = parse_git_url(url)?;
    let local_path = cache_root().join(format!("{}-{}", owner, name));

    if local_path.join(".git").is_dir() {
        let repo = git2::Repository::open(&local_path)
            .map_err(|e| format!("Failed to open repo: {}", e))?;

        repo.find_remote("origin")
            .map_err(|e| format!("No remote 'origin': {}", e))?
            .fetch(&["main", "master"], None, None)
            .map_err(|e| format!("Fetch failed: {}", e))?;

        if let Ok(fetch_head) = repo.find_reference("FETCH_HEAD") {
            if let Ok(commit) = fetch_head.peel_to_commit() {
                let _ = repo.reset(commit.as_object(), git2::ResetType::Hard, None);
            }
        }

        Ok(local_path)
    } else {
        fs::create_dir_all(&local_path)
            .map_err(|e| format!("Cannot create cache dir: {}", e))?;

        git2::Repository::clone(url, &local_path)
            .map_err(|e| format!("Clone failed: {}", e))?;

        Ok(local_path)
    }
}

pub fn parse_repo_skills(repo_path: &Path) -> Vec<RepoSkill> {
    let mut skills = Vec::new();

    let skills_dir = repo_path.join("skills");
    let search_dir = if skills_dir.is_dir() {
        &skills_dir
    } else {
        repo_path
    };

    scan_skills_recursive(search_dir, repo_path, &mut skills, 0);
    skills
}

fn scan_skills_recursive(
    dir: &Path,
    repo_root: &Path,
    skills: &mut Vec<RepoSkill>,
    depth: u32,
) {
    if depth > 5 {
        return;
    }

    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        let dir_name = path.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default();
        if dir_name.starts_with('.') {
            continue;
        }

        if path.join("SKILL.md").is_file() {
            if let Some(parsed) = parse_skill(&path, Provider::ClaudeCode) {
                let relative = path
                    .strip_prefix(repo_root)
                    .map(|p| p.to_string_lossy().to_string())
                    .unwrap_or_default();

                skills.push(RepoSkill {
                    dir_name: parsed.dir_name,
                    name: parsed.name,
                    description: parsed.description,
                    valid: parsed.valid,
                    relative_path: relative,
                    has_hooks: parsed.has_hooks,
                    has_mcp: parsed.has_mcp,
                    has_plugin: parsed.has_plugin,
                });
            }
        } else {
            scan_skills_recursive(&path, repo_root, skills, depth + 1);
        }
    }
}

pub fn add_repo(url: &str) -> Result<Repo, String> {
    let (owner, name) = parse_git_url(url)?;
    let local_path = clone_or_pull(url)?;
    let skills = parse_repo_skills(&local_path);

    if skills.is_empty() {
        return Err("该仓库未找到任何 skill（需包含 SKILL.md 的目录）".to_string());
    }

    Ok(Repo {
        url: url.to_string(),
        owner,
        name,
        local_path,
        skills,
    })
}

pub fn get_cache_size() -> Result<u64, String> {
    let root = cache_root();
    if !root.is_dir() {
        return Ok(0);
    }
    dir_size(&root).map_err(|e| e.to_string())
}

fn dir_size(path: &Path) -> std::io::Result<u64> {
    let mut total = 0;
    if path.is_dir() {
        for entry in fs::read_dir(path)? {
            let entry = entry?;
            let meta = entry.metadata()?;
            if meta.is_dir() {
                total += dir_size(&entry.path())?;
            } else {
                total += meta.len();
            }
        }
    }
    Ok(total)
}

pub fn clear_cache() -> Result<(), String> {
    let root = cache_root();
    if root.is_dir() {
        fs::remove_dir_all(&root).map_err(|e| format!("Failed to clear cache: {}", e))?;
    }
    Ok(())
}

pub fn remove_repo_cache(url: &str) -> Result<(), String> {
    let (owner, name) = parse_git_url(url)?;
    let local_path = cache_root().join(format!("{}-{}", owner, name));
    if local_path.is_dir() {
        fs::remove_dir_all(&local_path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_https_url() {
        let (owner, name) = parse_git_url("https://github.com/anthropics/skills").unwrap();
        assert_eq!(owner, "anthropics");
        assert_eq!(name, "skills");
    }

    #[test]
    fn parse_https_url_with_git_suffix() {
        let (owner, name) =
            parse_git_url("https://github.com/anthropics/skills.git").unwrap();
        assert_eq!(owner, "anthropics");
        assert_eq!(name, "skills");
    }

    #[test]
    fn parse_ssh_url() {
        let (owner, name) = parse_git_url("git@github.com:anthropics/skills.git").unwrap();
        assert_eq!(owner, "anthropics");
        assert_eq!(name, "skills");
    }

    #[test]
    fn parse_invalid_url_errors() {
        assert!(parse_git_url("not-a-url").is_err());
    }

    #[test]
    fn parse_repo_skills_from_skills_dir() {
        let tmp = tempfile::TempDir::new().unwrap();
        let skills_dir = tmp.path().join("skills").join("my-skill");
        fs::create_dir_all(&skills_dir).unwrap();
        fs::write(
            skills_dir.join("SKILL.md"),
            "---\nname: my-skill\ndescription: test\n---\n",
        )
        .unwrap();

        let skills = parse_repo_skills(tmp.path());
        assert_eq!(skills.len(), 1);
        assert_eq!(skills[0].dir_name, "my-skill");
        assert_eq!(skills[0].relative_path, "skills/my-skill");
    }
}
