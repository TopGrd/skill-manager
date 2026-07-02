use crate::provider::Provider;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Skill {
    pub provider: Provider,
    pub dir_name: String,
    pub path: PathBuf,
    pub name: Option<String>,
    pub description: Option<String>,
    pub valid: bool,
    pub source: SkillSource,
    pub has_hooks: bool,
    pub has_mcp: bool,
    pub has_plugin: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SkillSource {
    Local,
    Repo { url: String },
}

#[derive(Debug, Deserialize)]
struct Frontmatter {
    name: Option<String>,
    description: Option<String>,
}

pub fn parse_skill(dir: &Path, provider: Provider) -> Option<Skill> {
    let skill_md = dir.join("SKILL.md");
    if !skill_md.is_file() {
        return None;
    }

    let content = fs::read_to_string(&skill_md).ok()?;
    let fm = parse_frontmatter(&content);

    let dir_name = dir.file_name()?.to_string_lossy().to_string();
    let valid = fm.name.is_some() && fm.description.is_some();

    let has_hooks = dir.join("hooks").is_dir();
    let has_mcp = dir.join(".mcp.json").is_file();
    let has_plugin = dir.join(".claude-plugin").is_dir();

    Some(Skill {
        provider,
        dir_name,
        path: dir.to_path_buf(),
        name: fm.name,
        description: fm.description,
        valid,
        source: SkillSource::Local,
        has_hooks,
        has_mcp,
        has_plugin,
    })
}

fn parse_frontmatter(content: &str) -> Frontmatter {
    let trimmed = content.trim_start();
    if !trimmed.starts_with("---") {
        return Frontmatter {
            name: None,
            description: None,
        };
    }

    let after_open = &trimmed[3..];
    let end = after_open.find("\n---");
    let yaml_str = match end {
        Some(pos) => &after_open[..pos],
        None => {
            return Frontmatter {
                name: None,
                description: None,
            }
        }
    };

    serde_yaml::from_str(yaml_str).unwrap_or(Frontmatter {
        name: None,
        description: None,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    fn make_skill_dir(dir: &Path, frontmatter: &str) {
        fs::create_dir_all(dir).unwrap();
        fs::write(dir.join("SKILL.md"), frontmatter).unwrap();
    }

    #[test]
    fn parse_valid_skill() {
        let tmp = TempDir::new().unwrap();
        let skill_dir = tmp.path().join("my-skill");
        make_skill_dir(
            &skill_dir,
            "---\nname: my-skill\ndescription: A test skill\n---\n\nContent here.",
        );

        let skill = parse_skill(&skill_dir, Provider::ClaudeCode).unwrap();
        assert_eq!(skill.name.as_deref(), Some("my-skill"));
        assert_eq!(skill.description.as_deref(), Some("A test skill"));
        assert!(skill.valid);
        assert_eq!(skill.dir_name, "my-skill");
    }

    #[test]
    fn parse_skill_missing_name_is_invalid() {
        let tmp = TempDir::new().unwrap();
        let skill_dir = tmp.path().join("no-name");
        make_skill_dir(
            &skill_dir,
            "---\ndescription: No name field\n---\n\nContent.",
        );

        let skill = parse_skill(&skill_dir, Provider::Codex).unwrap();
        assert!(!skill.valid);
        assert!(skill.name.is_none());
    }

    #[test]
    fn parse_skill_no_skillmd_returns_none() {
        let tmp = TempDir::new().unwrap();
        let skill_dir = tmp.path().join("empty-dir");
        fs::create_dir_all(&skill_dir).unwrap();

        assert!(parse_skill(&skill_dir, Provider::ClaudeCode).is_none());
    }

    #[test]
    fn parse_skill_no_frontmatter_is_invalid() {
        let tmp = TempDir::new().unwrap();
        let skill_dir = tmp.path().join("no-fm");
        make_skill_dir(&skill_dir, "Just content, no frontmatter.");

        let skill = parse_skill(&skill_dir, Provider::ClaudeCode).unwrap();
        assert!(!skill.valid);
    }

    #[test]
    fn detects_hooks_and_mcp() {
        let tmp = TempDir::new().unwrap();
        let skill_dir = tmp.path().join("plugin-skill");
        make_skill_dir(
            &skill_dir,
            "---\nname: ps\ndescription: Plugin skill\n---\n",
        );
        fs::create_dir_all(skill_dir.join("hooks")).unwrap();
        fs::write(skill_dir.join(".mcp.json"), "{}").unwrap();
        fs::create_dir_all(skill_dir.join(".claude-plugin")).unwrap();

        let skill = parse_skill(&skill_dir, Provider::ClaudeCode).unwrap();
        assert!(skill.has_hooks);
        assert!(skill.has_mcp);
        assert!(skill.has_plugin);
    }
}
