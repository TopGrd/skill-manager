use crate::provider::Provider;
use crate::skill::{parse_skill, Skill, SkillSource};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallResult {
    pub installed_paths: Vec<PathBuf>,
    pub skills: Vec<Skill>,
}

pub fn install_skill(
    source_dir: &Path,
    providers: &[Provider],
    repo_url: Option<&str>,
) -> Result<InstallResult, String> {
    let dir_name = source_dir
        .file_name()
        .ok_or("Invalid source directory")?
        .to_string_lossy()
        .to_string();

    if !source_dir.join("SKILL.md").is_file() {
        return Err("Source directory does not contain SKILL.md".to_string());
    }

    let mut installed_paths = Vec::new();
    let mut skills = Vec::new();

    for provider in providers {
        let target_root = provider.install_root();
        fs::create_dir_all(&target_root)
            .map_err(|e| format!("Cannot create directory {}: {}", target_root.display(), e))?;

        let target_dir = target_root.join(&dir_name);

        if target_dir.exists() {
            fs::remove_dir_all(&target_dir)
                .map_err(|e| format!("Cannot remove {}: {}", target_dir.display(), e))?;
        }

        copy_dir_all(source_dir, &target_dir)?;

        installed_paths.push(target_dir.clone());

        if let Some(mut skill) = parse_skill(&target_dir, *provider) {
            if let Some(url) = repo_url {
                skill.source = SkillSource::Repo {
                    url: url.to_string(),
                };
            }
            skills.push(skill);
        }
    }

    Ok(InstallResult {
        installed_paths,
        skills,
    })
}

pub fn uninstall_skill(path: &Path) -> Result<(), String> {
    if !path.is_dir() {
        return Err(format!("Directory not found: {}", path.display()));
    }

    if !path.join("SKILL.md").is_file() {
        return Err("Target does not look like a skill directory (no SKILL.md)".to_string());
    }

    fs::remove_dir_all(path)
        .map_err(|e| format!("Failed to remove {}: {}", path.display(), e))
}

pub fn check_existing(dir_name: &str, providers: &[Provider]) -> Vec<PathBuf> {
    providers
        .iter()
        .filter_map(|p| {
            let target = p.install_root().join(dir_name);
            if target.is_dir() {
                Some(target)
            } else {
                None
            }
        })
        .collect()
}

pub fn create_skill(
    name: &str,
    description: &str,
    content: &str,
    provider: &Provider,
) -> Result<PathBuf, String> {
    let target_root = provider.install_root();
    fs::create_dir_all(&target_root)
        .map_err(|e| format!("Cannot create directory: {}", e))?;

    let skill_dir = target_root.join(name);
    if skill_dir.exists() {
        return Err(format!("Skill '{}' already exists at {}", name, skill_dir.display()));
    }

    fs::create_dir_all(&skill_dir).map_err(|e| e.to_string())?;

    let skill_md = if content.trim_start().starts_with("---") {
        content.to_string()
    } else {
        format!("---\nname: {}\ndescription: {}\n---\n\n{}", name, description, content)
    };

    fs::write(skill_dir.join("SKILL.md"), &skill_md).map_err(|e| e.to_string())?;

    Ok(skill_dir)
}

pub fn copy_dir_all(src: &Path, dst: &Path) -> Result<(), String> {
    fs::create_dir_all(dst).map_err(|e| format!("mkdir {}: {}", dst.display(), e))?;
    for entry in fs::read_dir(src).map_err(|e| format!("readdir {}: {}", src.display(), e))? {
        let entry = entry.map_err(|e| e.to_string())?;
        let ty = entry.file_type().map_err(|e| e.to_string())?;
        let dst_path = dst.join(entry.file_name());
        if ty.is_dir() {
            copy_dir_all(&entry.path(), &dst_path)?;
        } else {
            fs::copy(entry.path(), &dst_path)
                .map_err(|e| format!("copy {}: {}", entry.path().display(), e))?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn make_skill_source(dir: &Path) {
        fs::create_dir_all(dir).unwrap();
        fs::write(
            dir.join("SKILL.md"),
            "---\nname: test\ndescription: A test\n---\nContent",
        )
        .unwrap();
        let scripts = dir.join("scripts");
        fs::create_dir_all(&scripts).unwrap();
        fs::write(scripts.join("run.sh"), "#!/bin/bash\necho hi").unwrap();
    }

    #[test]
    fn copy_dir_preserves_structure() {
        let tmp = TempDir::new().unwrap();
        let src = tmp.path().join("src");
        make_skill_source(&src);

        let dst = tmp.path().join("dst");
        copy_dir_all(&src, &dst).unwrap();

        assert!(dst.join("SKILL.md").is_file());
        assert!(dst.join("scripts/run.sh").is_file());
    }

    #[test]
    fn uninstall_removes_directory() {
        let tmp = TempDir::new().unwrap();
        let skill_dir = tmp.path().join("my-skill");
        make_skill_source(&skill_dir);

        uninstall_skill(&skill_dir).unwrap();
        assert!(!skill_dir.exists());
    }

    #[test]
    fn uninstall_nonexistent_errors() {
        assert!(uninstall_skill(Path::new("/nonexistent/path")).is_err());
    }

    #[test]
    fn check_existing_finds_installed() {
        let existing = check_existing("definitely-not-installed-skill-xyz", Provider::all());
        assert!(existing.is_empty());
    }

    #[test]
    fn create_skill_writes_skillmd() {
        let tmp = TempDir::new().unwrap();
        let provider_dir = tmp.path().join("skills");
        fs::create_dir_all(&provider_dir).unwrap();

        let skill_dir = provider_dir.join("my-new-skill");
        fs::create_dir_all(&skill_dir).unwrap();
        let content = "---\nname: my-new-skill\ndescription: Test\n---\n\nHello";
        fs::write(skill_dir.join("SKILL.md"), content).unwrap();

        assert!(skill_dir.join("SKILL.md").is_file());
        let read = fs::read_to_string(skill_dir.join("SKILL.md")).unwrap();
        assert!(read.contains("my-new-skill"));
    }
}
