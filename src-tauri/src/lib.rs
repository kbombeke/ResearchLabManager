use std::path::Path;

#[tauri::command]
fn copy_file(source: String, destination: String) -> Result<(), String> {
    if let Some(parent) = Path::new(&destination).parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::copy(&source, &destination).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn file_exists(path: String) -> bool {
    Path::new(&path).exists()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![copy_file, file_exists])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
