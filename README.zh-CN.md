# Skill Manager

---

[English](README.md) | 中文

跨 provider 的 **Agent Skills** 桌面管理器。统一浏览、查看、安装、卸载 [Claude Code](https://claude.com/claude-code) 与 [Codex](https://openai.com/codex/) 的 skill，告别手动 `git clone` + 拷贝目录。

<p align="center">
<img alt="platform" src="https://img.shields.io/badge/platform-macOS-lightgrey" />
<img alt="framework" src="https://img.shields.io/badge/framework-Tauri-24c8db" />
<img alt="provider" src="https://img.shields.io/badge/provider-Claude_Code-cc785c" />
<img alt="provider" src="https://img.shields.io/badge/provider-Codex-10a37f" />
<img alt="license" src="https://img.shields.io/badge/license-MIT-brightgreen" />
</p>

## 截图

| 本机 skill 浏览 | ClawHub 市场安装 |
| --- | --- |
| ![本机 skill 浏览](screenshots/local-skills.png) | ![ClawHub 市场安装](screenshots/market-clawhub.png) |

## 功能特性

- **跨 provider 统一浏览**：一个界面查看 Claude Code（`~/.claude/skills`）与 Codex（`~/.agents/skills`）已安装的全部 skill，按 provider 筛选、搜索。
- **可视化查看内容**：目录树 + 文件查看器，直接渲染 `SKILL.md`，无需打开终端翻文件。
- **多来源安装**：
  - 从 [ClawHub](https://clawhub.ai) 市场搜索安装；
  - 粘贴 GitHub 仓库中某个 skill 目录的链接直接安装；
  - 添加任意 git 仓库作为长期 skill 源，浏览仓库内所有 skill 并安装；
  - 本地直接创建新 skill（自动生成 `SKILL.md` frontmatter）。
- **安全的安装/卸载确认**：覆盖已存在的 skill 前会明确提示"将删除并重新写入，不可恢复"；若 skill 含 hooks/MCP 配置，会提前警示安装后将被执行。
- **只读优先**：不修改任何 skill 的启用/禁用状态或 provider 配置文件，只做文件级别的安装与卸载。

## 不做什么（非目标）

- 不做 skill 的启用/禁用（会侵入式修改 config/frontmatter）；
- 不做 `SKILL.md` 在线编辑；
- 不扫描项目级（`.claude/skills`、`.agents/skills`）与 ADMIN scope；
- 不做自动更新检测（更新即重新安装覆盖）；
- 不做全网市场搜索（仓库来源的搜索仅限已添加的仓库）；
- 目前仅支持 **macOS**。

## 下载安装

前往 [Releases](https://github.com/TopGrd/skill-manager/releases) 页面下载最新的 `.dmg` 安装包。

> 由于尚未进行 Apple 开发者签名与公证，首次打开会被 Gatekeeper 拦截并提示"文件已损坏"或"无法验证开发者"。解决方法二选一：
>
> - 在「访达」中右键点击 `Skill Manager.app` → 选择「打开」，在弹窗中再次确认「打开」；
> - 或在终端执行：`xattr -cr /Applications/Skill\ Manager.app`

## 本地开发

### 环境依赖

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/)（本项目锁定 `pnpm@10.33.0`，建议用 `corepack enable` 自动匹配版本）
- [Rust](https://www.rust-lang.org/tools/install)（通过 `rustup` 安装，stable 工具链）
- macOS 需安装 Xcode Command Line Tools（`xcode-select --install` 即可，无需完整 Xcode）

完整前置依赖说明参考 [Tauri 官方文档](https://v2.tauri.app/start/prerequisites/)。

### 常用命令

```bash
# 安装依赖
pnpm install

# 启动开发模式（热重载，含 Rust 后端）
pnpm tauri dev

# 构建生产安装包
pnpm tauri build

# 运行 Rust 后端测试
cd src-tauri && cargo test
```

### 项目结构

```
src/            React 前端（Tauri WebView）
src-tauri/      Rust 后端（Tauri commands：文件扫描、git 操作、安装/卸载逻辑）
```

## 贡献指南

欢迎提交 Issue 与 Pull Request。

1. Fork 本仓库，基于 `main` 创建功能分支；
2. 提交前请确保通过：`pnpm build`（TypeScript 类型检查）与 `cd src-tauri && cargo test`；
3. Commit message 建议遵循 [Conventional Commits](https://www.conventionalcommits.org/)（如 `fix: ...`、`feat: ...`）；
4. 提交 PR 时请描述改动动机与验证方式，UI 改动建议附带截图。

## License

[MIT](LICENSE)
