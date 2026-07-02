pub mod clawhub;
pub mod commands;
pub mod github_import;
pub mod installer;
pub mod provider;
pub mod repo;
pub mod scanner;
pub mod skill;

use commands::{
    add_repo, check_existing, clawhub_detail, clawhub_install, clawhub_list, clawhub_search, clear_cache,
    create_skill, get_cache_size, get_file_content, get_file_tree, get_scan_roots, get_skills,
    github_import_skill, github_preview_skill, install_skill, open_in_vscode, refresh_repo, remove_repo_cache,
    reveal_in_finder, uninstall_skill,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      get_skills,
      get_file_tree,
      get_file_content,
      get_scan_roots,
      add_repo,
      refresh_repo,
      get_cache_size,
      clear_cache,
      remove_repo_cache,
      install_skill,
      uninstall_skill,
      check_existing,
      reveal_in_finder,
      open_in_vscode,
      clawhub_search,
      clawhub_list,
      clawhub_install,
      clawhub_detail,
      github_import_skill,
      github_preview_skill,
      create_skill,
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
