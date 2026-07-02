use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Provider {
    ClaudeCode,
    Codex,
}

impl Provider {
    pub fn scan_root(&self) -> PathBuf {
        let home = dirs::home_dir().expect("cannot resolve home directory");
        match self {
            Provider::ClaudeCode => home.join(".claude").join("skills"),
            Provider::Codex => home.join(".agents").join("skills"),
        }
    }

    pub fn install_root(&self) -> PathBuf {
        self.scan_root()
    }

    pub fn display_name(&self) -> &'static str {
        match self {
            Provider::ClaudeCode => "Claude Code",
            Provider::Codex => "Codex",
        }
    }

    pub fn all() -> &'static [Provider] {
        &[Provider::ClaudeCode, Provider::Codex]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn claude_code_scan_root_ends_with_claude_skills() {
        let root = Provider::ClaudeCode.scan_root();
        assert!(root.ends_with(".claude/skills"));
    }

    #[test]
    fn codex_scan_root_ends_with_agents_skills() {
        let root = Provider::Codex.scan_root();
        assert!(root.ends_with(".agents/skills"));
    }

    #[test]
    fn install_root_equals_scan_root() {
        for p in Provider::all() {
            assert_eq!(p.scan_root(), p.install_root());
        }
    }

    #[test]
    fn display_names() {
        assert_eq!(Provider::ClaudeCode.display_name(), "Claude Code");
        assert_eq!(Provider::Codex.display_name(), "Codex");
    }
}
