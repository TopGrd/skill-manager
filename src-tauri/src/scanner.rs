use crate::provider::Provider;
use crate::skill::{parse_skill, Skill};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileNode {
    pub name: String,
    pub path: PathBuf,
    pub is_dir: bool,
    pub children: Vec<FileNode>,
    pub size: u64,
    pub is_binary: bool,
}

const BINARY_EXTENSIONS: &[&str] = &[
    "png", "jpg", "jpeg", "gif", "ico", "webp", "bmp", "svg",
    "woff", "woff2", "ttf", "otf", "eot",
    "zip", "tar", "gz", "bz2", "7z", "rar",
    "exe", "dll", "so", "dylib", "wasm",
    "pdf", "doc", "docx", "xls", "xlsx",
    "mp3", "mp4", "avi", "mov", "wav",
];

const MAX_FILE_SIZE: u64 = 1_048_576; // 1MB

pub fn scan_provider(provider: Provider) -> Vec<Skill> {
    scan_directory(&provider.scan_root(), provider)
}

pub fn scan_directory(root: &Path, provider: Provider) -> Vec<Skill> {
    let mut skills = Vec::new();
    let mut visited = HashSet::new();

    if !root.is_dir() {
        return skills;
    }

    let real_root = root.canonicalize().unwrap_or_else(|_| root.to_path_buf());
    visited.insert(real_root);

    let entries = match fs::read_dir(root) {
        Ok(entries) => entries,
        Err(_) => return skills,
    };

    for entry in entries.flatten() {
        let path = entry.path();

        if path.is_symlink() {
            if let Ok(real) = path.canonicalize() {
                if !visited.insert(real) {
                    continue; // symlink loop
                }
            } else {
                continue; // broken symlink
            }
        }

        if !path.is_dir() {
            continue;
        }

        if let Some(skill) = parse_skill(&path, provider) {
            skills.push(skill);
        }
    }

    skills
}

pub fn scan_all(extra_dirs: &[PathBuf]) -> Vec<Skill> {
    let mut skills = Vec::new();
    for provider in Provider::all() {
        skills.extend(scan_provider(*provider));
    }
    for dir in extra_dirs {
        skills.extend(scan_directory(dir, Provider::ClaudeCode));
    }
    skills
}

pub fn build_file_tree(root: &Path) -> Option<FileNode> {
    build_tree_inner(root, &mut HashSet::new(), 0)
}

fn build_tree_inner(path: &Path, visited: &mut HashSet<PathBuf>, depth: u32) -> Option<FileNode> {
    if depth > 20 {
        return None;
    }

    if path.is_symlink() {
        if let Ok(real) = path.canonicalize() {
            if !visited.insert(real) {
                return None;
            }
        } else {
            return None;
        }
    }

    let name = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();

    if path.is_dir() {
        let mut children: Vec<FileNode> = fs::read_dir(path)
            .ok()?
            .flatten()
            .filter_map(|e| build_tree_inner(&e.path(), visited, depth + 1))
            .collect();
        children.sort_by(|a, b| match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        });

        Some(FileNode {
            name,
            path: path.to_path_buf(),
            is_dir: true,
            children,
            size: 0,
            is_binary: false,
        })
    } else {
        let meta = fs::metadata(path).ok()?;
        let ext = path
            .extension()
            .map(|e| e.to_string_lossy().to_lowercase())
            .unwrap_or_default();
        let is_binary = BINARY_EXTENSIONS.contains(&ext.as_str());

        Some(FileNode {
            name,
            path: path.to_path_buf(),
            is_dir: false,
            children: vec![],
            size: meta.len(),
            is_binary,
        })
    }
}

pub fn read_file_content(path: &Path) -> Result<FileContent, String> {
    if !path.is_file() {
        return Err("Not a file".to_string());
    }

    let meta = fs::metadata(path).map_err(|e| e.to_string())?;

    let ext = path
        .extension()
        .map(|e| e.to_string_lossy().to_lowercase())
        .unwrap_or_default();

    if BINARY_EXTENSIONS.contains(&ext.as_str()) {
        return Ok(FileContent {
            content: String::new(),
            truncated: false,
            is_binary: true,
            size: meta.len(),
            language: None,
        });
    }

    let full = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let truncated = meta.len() > MAX_FILE_SIZE;
    let content = if truncated {
        full.chars().take(10_000).collect()
    } else {
        full
    };

    let language = detect_language(&ext);

    Ok(FileContent {
        content,
        truncated,
        is_binary: false,
        size: meta.len(),
        language,
    })
}

pub fn detect_language(ext: &str) -> Option<String> {
    match ext {
        "rs" => Some("rust".into()),
        "ts" | "tsx" => Some("typescript".into()),
        "js" | "jsx" => Some("javascript".into()),
        "py" => Some("python".into()),
        "sh" | "bash" | "zsh" => Some("bash".into()),
        "json" => Some("json".into()),
        "toml" => Some("toml".into()),
        "yaml" | "yml" => Some("yaml".into()),
        "md" | "markdown" => Some("markdown".into()),
        "html" | "htm" => Some("html".into()),
        "css" => Some("css".into()),
        "sql" => Some("sql".into()),
        "go" => Some("go".into()),
        "java" => Some("java".into()),
        "rb" => Some("ruby".into()),
        "swift" => Some("swift".into()),
        "kt" => Some("kotlin".into()),
        "c" | "h" => Some("c".into()),
        "cpp" | "cc" | "cxx" | "hpp" => Some("cpp".into()),
        _ => None,
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileContent {
    pub content: String,
    pub truncated: bool,
    pub is_binary: bool,
    pub size: u64,
    pub language: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::os::unix::fs::symlink;
    use tempfile::TempDir;

    fn make_skill(dir: &Path, name: &str) {
        let skill_dir = dir.join(name);
        fs::create_dir_all(&skill_dir).unwrap();
        fs::write(
            skill_dir.join("SKILL.md"),
            format!(
                "---\nname: {}\ndescription: Test skill {}\n---\nContent.",
                name, name
            ),
        )
        .unwrap();
    }

    #[test]
    fn scan_finds_skills() {
        let tmp = TempDir::new().unwrap();
        make_skill(tmp.path(), "skill-a");
        make_skill(tmp.path(), "skill-b");
        fs::create_dir_all(tmp.path().join("not-a-skill")).unwrap();

        let skills = scan_directory(tmp.path(), Provider::ClaudeCode);
        assert_eq!(skills.len(), 2);
    }

    #[test]
    fn scan_skips_dirs_without_skill_md() {
        let tmp = TempDir::new().unwrap();
        fs::create_dir_all(tmp.path().join("empty")).unwrap();

        let skills = scan_directory(tmp.path(), Provider::ClaudeCode);
        assert!(skills.is_empty());
    }

    #[test]
    fn scan_nonexistent_dir_returns_empty() {
        let skills = scan_directory(Path::new("/nonexistent/path"), Provider::Codex);
        assert!(skills.is_empty());
    }

    #[test]
    fn scan_handles_symlink_loop() {
        let tmp = TempDir::new().unwrap();
        let dir_a = tmp.path().join("a");
        fs::create_dir_all(&dir_a).unwrap();
        let _ = symlink(tmp.path(), dir_a.join("loop-back"));

        let skills = scan_directory(tmp.path(), Provider::ClaudeCode);
        assert!(skills.is_empty());
    }

    #[test]
    fn build_tree_sorts_dirs_first() {
        let tmp = TempDir::new().unwrap();
        fs::write(tmp.path().join("b.txt"), "content").unwrap();
        fs::create_dir_all(tmp.path().join("a-dir")).unwrap();
        fs::write(tmp.path().join("a-dir").join("inner.txt"), "content").unwrap();

        let tree = build_file_tree(tmp.path()).unwrap();
        assert!(tree.children[0].is_dir);
        assert!(!tree.children[1].is_dir);
    }

    #[test]
    fn read_file_detects_binary() {
        let tmp = TempDir::new().unwrap();
        let png = tmp.path().join("image.png");
        fs::write(&png, &[0x89, 0x50, 0x4E, 0x47]).unwrap();

        let result = read_file_content(&png).unwrap();
        assert!(result.is_binary);
        assert!(result.content.is_empty());
    }

    #[test]
    fn read_file_text_content() {
        let tmp = TempDir::new().unwrap();
        let txt = tmp.path().join("readme.md");
        fs::write(&txt, "# Hello\nWorld").unwrap();

        let result = read_file_content(&txt).unwrap();
        assert!(!result.is_binary);
        assert_eq!(result.content, "# Hello\nWorld");
        assert_eq!(result.language.as_deref(), Some("markdown"));
    }
}
