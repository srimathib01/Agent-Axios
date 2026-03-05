use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use tauri::{AppHandle, WebviewWindow};
use tauri_plugin_dialog::DialogExt;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileInfo {
    pub path: String,
    pub name: String,
    pub content: String,
    pub language: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FolderInfo {
    pub path: String,
    pub name: String,
    pub files: Vec<FileTreeNode>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileTreeNode {
    pub name: String,
    pub path: String,
    #[serde(rename = "type")]
    pub node_type: String, // "file" or "directory"
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<FileTreeNode>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GitFileStatus {
    pub path: String,
    pub status: String,
}

// Map file extensions to Monaco language IDs
fn get_language_from_path(file_path: &str) -> String {
    let extension_map: HashMap<&str, &str> = [
        (".js", "javascript"),
        (".jsx", "javascript"),
        (".ts", "typescript"),
        (".tsx", "typescript"),
        (".py", "python"),
        (".java", "java"),
        (".go", "go"),
        (".rs", "rust"),
        (".c", "c"),
        (".cpp", "cpp"),
        (".h", "c"),
        (".hpp", "cpp"),
        (".cs", "csharp"),
        (".rb", "ruby"),
        (".php", "php"),
        (".swift", "swift"),
        (".kt", "kotlin"),
        (".scala", "scala"),
        (".html", "html"),
        (".css", "css"),
        (".scss", "scss"),
        (".less", "less"),
        (".json", "json"),
        (".xml", "xml"),
        (".yaml", "yaml"),
        (".yml", "yaml"),
        (".md", "markdown"),
        (".sql", "sql"),
        (".sh", "shell"),
        (".bash", "shell"),
        (".zsh", "shell"),
        (".ps1", "powershell"),
    ]
    .iter()
    .cloned()
    .collect();

    let path = Path::new(file_path);
    let basename = path.file_name().unwrap_or_default().to_string_lossy().to_lowercase();

    // Handle special filenames
    if basename == "dockerfile" {
        return "dockerfile".to_string();
    }
    if basename == "makefile" {
        return "makefile".to_string();
    }
    if basename.ends_with(".env") {
        return "dotenv".to_string();
    }

    // Check extension
    if let Some(ext) = path.extension() {
        let ext_str = format!(".{}", ext.to_string_lossy().to_lowercase());
        if let Some(lang) = extension_map.get(ext_str.as_str()) {
            return lang.to_string();
        }
    }

    "plaintext".to_string()
}

// Directories to skip when building file tree
fn should_skip_entry(name: &str) -> bool {
    let skip_dirs = [
        "node_modules",
        "__pycache__",
        "dist",
        "build",
        ".git",
        "venv",
        "env",
        "target",
        ".idea",
        ".vscode",
    ];
    name.starts_with('.') || skip_dirs.contains(&name)
}

fn build_file_tree_recursive(dir_path: &Path, depth: usize, max_depth: usize) -> Vec<FileTreeNode> {
    if depth > max_depth {
        return vec![];
    }

    let mut nodes: Vec<FileTreeNode> = vec![];

    let entries = match fs::read_dir(dir_path) {
        Ok(entries) => entries,
        Err(_) => return nodes,
    };

    let mut dirs: Vec<_> = vec![];
    let mut files: Vec<_> = vec![];

    for entry in entries.flatten() {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        if should_skip_entry(&name) {
            continue;
        }

        if path.is_dir() {
            dirs.push((name, path));
        } else {
            files.push((name, path));
        }
    }

    // Sort alphabetically
    dirs.sort_by(|a, b| a.0.to_lowercase().cmp(&b.0.to_lowercase()));
    files.sort_by(|a, b| a.0.to_lowercase().cmp(&b.0.to_lowercase()));

    // Add directories first
    for (name, path) in dirs {
        let children = build_file_tree_recursive(&path, depth + 1, max_depth);
        nodes.push(FileTreeNode {
            name,
            path: path.to_string_lossy().to_string(),
            node_type: "directory".to_string(),
            children: Some(children),
        });
    }

    // Then files
    for (name, path) in files {
        nodes.push(FileTreeNode {
            name,
            path: path.to_string_lossy().to_string(),
            node_type: "file".to_string(),
            children: None,
        });
    }

    nodes
}

// ============ File Dialog Commands ============

#[tauri::command]
pub async fn open_file_dialog(app: AppHandle) -> Result<Option<FileInfo>, String> {
    let file_path = app
        .dialog()
        .file()
        .add_filter("Code Files", &["js", "jsx", "ts", "tsx", "py", "java", "go", "rs", "c", "cpp", "h", "cs", "rb", "php"])
        .add_filter("Web Files", &["html", "css", "scss", "json", "xml"])
        .add_filter("All Files", &["*"])
        .blocking_pick_file();

    match file_path {
        Some(path) => {
            let path_str = path.to_string();
            let content = fs::read_to_string(&path_str).map_err(|e| e.to_string())?;
            let name = Path::new(&path_str)
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();
            let language = get_language_from_path(&path_str);

            Ok(Some(FileInfo {
                path: path_str,
                name,
                content,
                language,
            }))
        }
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn open_folder_dialog(app: AppHandle) -> Result<Option<FolderInfo>, String> {
    let folder_path = app.dialog().file().blocking_pick_folder();

    match folder_path {
        Some(path) => {
            let path_str = path.to_string();
            let name = Path::new(&path_str)
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();
            let files = build_file_tree_recursive(Path::new(&path_str), 0, 5);

            Ok(Some(FolderInfo {
                path: path_str,
                name,
                files,
            }))
        }
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn save_file_dialog(app: AppHandle, default_path: Option<String>) -> Result<Option<String>, String> {
    let mut dialog = app
        .dialog()
        .file()
        .add_filter("Code Files", &["js", "jsx", "ts", "tsx", "py", "java", "go", "rs"])
        .add_filter("All Files", &["*"]);

    if let Some(path) = default_path {
        dialog = dialog.set_file_name(&path);
    }

    match dialog.blocking_save_file() {
        Some(path) => Ok(Some(path.to_string())),
        None => Ok(None),
    }
}

// ============ File Operations Commands ============

#[tauri::command]
pub async fn read_file(path: String) -> Result<FileInfo, String> {
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let name = Path::new(&path)
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();
    let language = get_language_from_path(&path);

    Ok(FileInfo {
        path,
        name,
        content,
        language,
    })
}

#[tauri::command]
pub async fn write_file(path: String, content: String) -> Result<(), String> {
    // Ensure parent directory exists
    if let Some(parent) = Path::new(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn file_exists(path: String) -> Result<bool, String> {
    Ok(Path::new(&path).exists())
}

#[tauri::command]
pub async fn delete_file(path: String) -> Result<(), String> {
    let file_path = Path::new(&path);
    if !file_path.exists() {
        return Err("File does not exist".to_string());
    }
    if file_path.is_dir() {
        fs::remove_dir_all(&path).map_err(|e| e.to_string())
    } else {
        fs::remove_file(&path).map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub async fn create_directory(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_file_tree(dir_path: String) -> Result<Vec<FileTreeNode>, String> {
    let path = Path::new(&dir_path);
    if !path.exists() || !path.is_dir() {
        return Err("Invalid directory path".to_string());
    }
    Ok(build_file_tree_recursive(path, 0, 5))
}

#[tauri::command]
pub async fn get_git_status(repo_path: String) -> Result<Vec<GitFileStatus>, String> {
    let path = Path::new(&repo_path);
    if !path.exists() || !path.is_dir() {
        return Err(format!("Repository path not found: {}", repo_path));
    }

    let output = std::process::Command::new("git")
        .current_dir(path)
        .arg("status")
        .arg("--porcelain")
        .output()
        .map_err(|e| format!("Failed to execute git status: {}", e))?;

    if !output.status.success() {
        // Not a git repository or other error
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Git error: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut files: Vec<GitFileStatus> = vec![];

    for line in stdout.lines() {
        if line.len() < 4 {
            continue;
        }

        // git status --porcelain formats as "XY path"
        let status = line[0..2].to_string();
        
        // Remove quotes if present (git status might quote filenames with spaces)
        let mut file_path = line[3..].to_string();
        if file_path.starts_with('"') && file_path.ends_with('"') {
            file_path = file_path[1..file_path.len()-1].to_string();
        }

        files.push(GitFileStatus {
            path: file_path,
            status,
        });
    }

    Ok(files)
}

// ============ App Info Commands ============

#[tauri::command]
pub async fn get_app_version(app: AppHandle) -> Result<String, String> {
    Ok(app.package_info().version.to_string())
}

#[tauri::command]
pub async fn get_platform() -> Result<String, String> {
    Ok(std::env::consts::OS.to_string())
}

#[tauri::command]
pub async fn get_app_name(app: AppHandle) -> Result<String, String> {
    Ok(app.package_info().name.clone())
}

// ============ Window Control Commands ============

#[tauri::command]
pub async fn minimize_window(window: WebviewWindow) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn maximize_window(window: WebviewWindow) -> Result<(), String> {
    if window.is_maximized().unwrap_or(false) {
        window.unmaximize().map_err(|e| e.to_string())
    } else {
        window.maximize().map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub async fn close_window(window: WebviewWindow) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

// ============ Agent-Axios Integration Commands ============

/// Get the base path for Agent-Axios data directories
fn get_agent_axios_base_path() -> Result<std::path::PathBuf, String> {
    // Get the executable directory and navigate to Agent-Axios
    let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;
    let exe_dir = exe_path.parent().ok_or("Could not get executable directory")?;

    // Navigate up from desktop/src-tauri/target/debug to Agent-Axios root
    // In dev: AI-CodeEditor/securefix-ide/desktop/src-tauri/target/debug
    // Target: Agent-Axios/agent-axios-backend/data
    let agent_axios_path = exe_dir
        .join("../../../../../Agent-Axios")
        .canonicalize()
        .unwrap_or_else(|_| {
            // Fallback: try from current working directory
            std::env::current_dir()
                .unwrap_or_default()
                .join("../../../Agent-Axios")
        });

    Ok(agent_axios_path)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[allow(dead_code)]
pub struct AnalysisReport {
    pub generated_at: String,
    pub analysis: serde_json::Value,
    pub summary: serde_json::Value,
    pub findings: Vec<serde_json::Value>,
}

#[tauri::command]
pub async fn read_agent_axios_report(report_path: String) -> Result<String, String> {
    let base_path = get_agent_axios_base_path()?;
    let full_path = base_path.join(&report_path);

    if !full_path.exists() {
        return Err(format!("Report not found: {}", full_path.display()));
    }

    fs::read_to_string(&full_path).map_err(|e| format!("Failed to read report: {}", e))
}

#[tauri::command]
pub async fn list_analysis_reports(reports_dir: String) -> Result<Vec<i32>, String> {
    let base_path = get_agent_axios_base_path()?;
    let full_path = base_path.join(&reports_dir);

    if !full_path.exists() {
        return Ok(vec![]);
    }

    let mut analysis_ids: Vec<i32> = vec![];

    if let Ok(entries) = fs::read_dir(&full_path) {
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            // Extract analysis ID from folder name "analysis_123"
            if name.starts_with("analysis_") {
                if let Ok(id) = name.trim_start_matches("analysis_").parse::<i32>() {
                    analysis_ids.push(id);
                }
            }
        }
    }

    analysis_ids.sort_by(|a, b| b.cmp(a)); // Sort descending (newest first)
    Ok(analysis_ids)
}

#[tauri::command]
pub async fn get_repository_local_path(
    repo_url: String,
    python_repos_dir: String,
    node_repos_dir: String,
) -> Result<Option<String>, String> {
    let base_path = get_agent_axios_base_path()?;

    // Check Python backend cache first
    let python_cache = base_path.join(&python_repos_dir);
    if python_cache.exists() {
        // Python uses SHA256 hash of "url:branch"
        let hash_input = format!("{}:default", repo_url);
        let hash = sha256_hash(&hash_input);
        let cached_path = python_cache.join(&hash);
        if cached_path.exists() {
            return Ok(Some(cached_path.to_string_lossy().to_string()));
        }
    }

    // Check Node backend cache
    let node_cache = base_path.join(&node_repos_dir);
    if node_cache.exists() {
        // Node uses repoName_timestamp pattern
        if let Ok(entries) = fs::read_dir(&node_cache) {
            // Extract repo name from URL
            let repo_name = repo_url
                .trim_end_matches('/')
                .rsplit('/')
                .next()
                .unwrap_or("")
                .trim_end_matches(".git");

            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_string();
                if name.starts_with(repo_name) {
                    return Ok(Some(entry.path().to_string_lossy().to_string()));
                }
            }
        }
    }

    Ok(None)
}

/// Simple SHA256 hash function for cache key generation
fn sha256_hash(input: &str) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};

    // Note: This is a simplified hash for demonstration
    // In production, use a proper SHA256 implementation
    let mut hasher = DefaultHasher::new();
    input.hash(&mut hasher);
    format!("{:x}", hasher.finish())
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CachedRepository {
    pub name: String,
    pub path: String,
    pub source: String, // "python" or "node"
}

#[tauri::command]
pub async fn list_cached_repositories() -> Result<Vec<CachedRepository>, String> {
    let base_path = get_agent_axios_base_path()?;
    let mut repos: Vec<CachedRepository> = vec![];

    // Check Python backend cache
    let python_cache = base_path.join("agent-axios-backend/data/cache/repositories");
    if python_cache.exists() {
        if let Ok(entries) = fs::read_dir(&python_cache) {
            for entry in entries.flatten() {
                if entry.path().is_dir() {
                    let name = entry.file_name().to_string_lossy().to_string();
                    repos.push(CachedRepository {
                        name: name.clone(),
                        path: entry.path().to_string_lossy().to_string(),
                        source: "python".to_string(),
                    });
                }
            }
        }
    }

    // Check Node backend cache
    let node_cache = base_path.join("agent-axios-node-backend/data/repositories");
    if node_cache.exists() {
        if let Ok(entries) = fs::read_dir(&node_cache) {
            for entry in entries.flatten() {
                if entry.path().is_dir() {
                    let name = entry.file_name().to_string_lossy().to_string();
                    // Extract readable name (before underscore timestamp)
                    let display_name = name.split('_').next().unwrap_or(&name).to_string();
                    repos.push(CachedRepository {
                        name: display_name,
                        path: entry.path().to_string_lossy().to_string(),
                        source: "node".to_string(),
                    });
                }
            }
        }
    }

    Ok(repos)
}

#[tauri::command]
pub async fn open_agent_axios_repository(repo_path: String) -> Result<FolderInfo, String> {
    let path = Path::new(&repo_path);
    if !path.exists() || !path.is_dir() {
        return Err(format!("Repository path not found: {}", repo_path));
    }

    let name = path
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let files = build_file_tree_recursive(path, 0, 5);

    Ok(FolderInfo {
        path: repo_path,
        name,
        files,
    })
}
