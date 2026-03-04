// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            commands::open_file_dialog,
            commands::open_folder_dialog,
            commands::save_file_dialog,
            commands::read_file,
            commands::write_file,
            commands::file_exists,
            commands::delete_file,
            commands::create_directory,
            commands::get_file_tree,
            commands::get_app_version,
            commands::get_platform,
            commands::get_app_name,
            commands::minimize_window,
            commands::maximize_window,
            commands::close_window,
            // Agent-Axios integration commands
            commands::read_agent_axios_report,
            commands::list_analysis_reports,
            commands::get_repository_local_path,
            commands::list_cached_repositories,
            commands::open_agent_axios_repository,
        ])
        .setup(|_app| {
            #[cfg(debug_assertions)]
            {
                use tauri::Manager;
                let window = _app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running SecureFix IDE");
}
