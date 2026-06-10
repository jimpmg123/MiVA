use reqwest::blocking::Client;
use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::env;
use std::fs;
use std::io::{BufRead, BufReader, Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use sysinfo::{Disks, System};
use tauri::{
    AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindow,
    WebviewWindowBuilder,
};

const CHARACTER_OVERLAY_LABEL: &str = "character-overlay";

#[cfg(windows)]
use std::os::windows::process::CommandExt;

const OLLAMA_BASE_URL: &str = "http://localhost:11434";
const LOCAL_HELPER_URL: &str = "http://127.0.0.1:43110";
const DESKTOP_BRIDGE_ADDR: &str = "127.0.0.1:43111";
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[cfg(windows)]
fn hide_console_window(command: &mut Command) {
    command.creation_flags(CREATE_NO_WINDOW);
}

#[cfg(not(windows))]
fn hide_console_window(_command: &mut Command) {}
const ALLOWED_MODELS: [&str; 6] = [
    "qwen3:4b",
    "exaone3.5:2.4b",
    "exaone3.5:7.8b",
    "llama3.2:3b",
    "gemma3:4b",
    "phi3:mini",
];
const ASSISTANT_PROFILE_STORE_FILE: &str = "assistant-profiles.json";
const CHAT_HISTORY_STORE_FILE: &str = "chat-history.json";
const LIBRARY_ITEMS_STORE_FILE: &str = "library-items.json";
const APP_PREFERENCES_FILE: &str = "app-preferences.json";
const MAX_IMAGE_ATTACHMENT_BYTES: u64 = 20 * 1024 * 1024;
const LIVE2D_MODEL_DIRS: [&str; 6] = ["mao_pro", "shizuku", "knight", "takodachi", "doro", "pichu"];

struct LocalHelperProcess(Mutex<Option<Child>>);

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct OllamaStatus {
    installed: bool,
    running: bool,
    command: Option<String>,
    version: Option<String>,
    installed_model_count: usize,
    installed_models: Vec<String>,
    base_url: String,
    error: Option<String>,
}

#[derive(Debug, Deserialize)]
struct TagsResponse {
    models: Vec<OllamaModel>,
}

#[derive(Debug, Deserialize)]
struct OllamaModel {
    name: Option<String>,
    model: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ChatResponse {
    message: Option<ChatMessage>,
}

#[derive(Debug, Deserialize)]
struct ChatMessage {
    content: String,
}

#[derive(Debug, Deserialize)]
struct HelperChatResponse {
    answer: Option<String>,
    message: Option<String>,
    error: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ModelDownloadProgress {
    model: String,
    status: String,
    completed: Option<u64>,
    total: Option<u64>,
    percent: Option<f64>,
    done: bool,
    paused: bool,
    error: Option<String>,
}

struct ActiveModelPull {
    model: String,
    cancel: Arc<AtomicBool>,
    pause: Arc<AtomicBool>,
}

static ACTIVE_MODEL_PULL: Mutex<Option<ActiveModelPull>> = Mutex::new(None);

#[derive(Debug, Deserialize)]
struct PullStreamMessage {
    status: Option<String>,
    digest: Option<String>,
    completed: Option<u64>,
    total: Option<u64>,
    error: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct HardwareInfo {
    cpu_brand: Option<String>,
    logical_core_count: usize,
    physical_core_count: Option<usize>,
    total_memory_gb: f64,
    available_memory_gb: f64,
    primary_disk_total_gb: f64,
    primary_disk_available_gb: f64,
    gpu_name: Option<String>,
    os_name: Option<String>,
    os_version: Option<String>,
    arch: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeRequirement {
    id: String,
    label: String,
    required_for: String,
    installed: bool,
    meets_minimum: bool,
    command: Option<String>,
    version: Option<String>,
    note: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeRequirements {
    python: RuntimeRequirement,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct Live2DInstallProgress {
    status: String,
    completed: u64,
    total: u64,
    percent: f64,
    done: bool,
    error: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct Live2DInstallResult {
    install_dir: String,
    model_base_dir: String,
    core_script_path: Option<String>,
    installed_models: Vec<String>,
    total_size_mb: f64,
    ready: bool,
}

fn empty_assistant_profile_store() -> Value {
    json!({
        "schemaVersion": 1,
        "activeProfileId": null,
        "profiles": [],
        "updatedAt": null
    })
}

fn assistant_profile_store_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    Ok(dir.join(ASSISTANT_PROFILE_STORE_FILE))
}

fn load_assistant_profile_store_inner(app: AppHandle) -> Result<Value, String> {
    let path = assistant_profile_store_path(&app)?;
    if !path.exists() {
        return Ok(empty_assistant_profile_store());
    }

    let content = fs::read_to_string(path).map_err(|error| error.to_string())?;
    if content.trim().is_empty() {
        return Ok(empty_assistant_profile_store());
    }

    serde_json::from_str::<Value>(&content).map_err(|error| error.to_string())
}

fn save_assistant_profile_store_inner(app: AppHandle, store: Value) -> Result<Value, String> {
    let path = assistant_profile_store_path(&app)?;
    let content = serde_json::to_string_pretty(&store).map_err(|error| error.to_string())?;
    fs::write(path, content).map_err(|error| error.to_string())?;
    Ok(store)
}

fn empty_app_preferences() -> Value {
    json!({
        "setupCompleted": false,
        "lastAppMode": "studio",
        "setupCompletedAt": null
    })
}

fn app_preferences_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    Ok(dir.join(APP_PREFERENCES_FILE))
}

fn load_app_preferences_inner(app: AppHandle) -> Result<Value, String> {
    let path = app_preferences_path(&app)?;
    if !path.exists() {
        return Ok(empty_app_preferences());
    }

    let content = fs::read_to_string(path).map_err(|error| error.to_string())?;
    if content.trim().is_empty() {
        return Ok(empty_app_preferences());
    }

    serde_json::from_str::<Value>(&content).map_err(|error| error.to_string())
}

fn save_app_preferences_inner(app: AppHandle, preferences: Value) -> Result<Value, String> {
    let path = app_preferences_path(&app)?;
    let content = serde_json::to_string_pretty(&preferences).map_err(|error| error.to_string())?;
    fs::write(path, content).map_err(|error| error.to_string())?;
    Ok(preferences)
}

fn empty_library_items_store() -> Value {
    json!({
        "schemaVersion": 1,
        "items": [],
        "updatedAt": null
    })
}

fn library_items_store_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    Ok(dir.join(LIBRARY_ITEMS_STORE_FILE))
}

fn normalize_library_items_store(store: Value) -> Value {
    let items = store
        .get("items")
        .filter(|value| value.is_array())
        .cloned()
        .unwrap_or_else(|| json!([]));

    json!({
        "schemaVersion": 1,
        "items": items,
        "updatedAt": store.get("updatedAt").and_then(Value::as_str)
    })
}

fn load_library_items_store_inner(app: AppHandle) -> Result<Value, String> {
    let path = library_items_store_path(&app)?;
    if !path.exists() {
        return Ok(empty_library_items_store());
    }

    let content = fs::read_to_string(path).map_err(|error| error.to_string())?;
    if content.trim().is_empty() {
        return Ok(empty_library_items_store());
    }

    let store = serde_json::from_str::<Value>(&content).map_err(|error| error.to_string())?;
    Ok(normalize_library_items_store(store))
}

fn save_library_items_store_inner(app: AppHandle, store: Value) -> Result<Value, String> {
    let path = library_items_store_path(&app)?;
    let normalized = normalize_library_items_store(store);
    let content = serde_json::to_string_pretty(&normalized).map_err(|error| error.to_string())?;
    fs::write(path, content).map_err(|error| error.to_string())?;
    Ok(normalized)
}

const OPENAI_FALLBACK_MODEL: &str = "gpt-4o-mini";
const OPENAI_FALLBACK_LABEL: &str = "GPT-4o mini";

fn migrate_profile_to_openai(profile: &mut Value, deleted_model: &str) -> bool {
    let provider = profile
        .get("provider")
        .and_then(Value::as_str)
        .unwrap_or_default();
    let model = profile
        .get("model")
        .and_then(Value::as_str)
        .unwrap_or_default();

    if provider != "ollama" || model != deleted_model {
        return false;
    }

    profile["provider"] = json!("openai");
    profile["model"] = json!(OPENAI_FALLBACK_MODEL);
    profile["modelLabel"] = json!(OPENAI_FALLBACK_LABEL);
    profile["providerMode"] = json!("cloud");
    if profile.get("localMode").is_some() {
        profile["localMode"] = json!("hybrid");
    }

    if let Some(recommendation) = profile
        .get_mut("recommendation")
        .and_then(Value::as_object_mut)
    {
        recommendation.insert("selectedProvider".to_string(), json!("openai"));
        recommendation.insert("selectedCloudModel".to_string(), json!(OPENAI_FALLBACK_MODEL));
    }

    if let Some(survey) = profile.get_mut("survey").and_then(Value::as_object_mut) {
        if survey.contains_key("localMode") {
            survey.insert("localMode".to_string(), json!("hybrid"));
        }
    }

    if let Some(summary_memory) = profile
        .pointer_mut("/prompt/settings/summaryMemory")
        .and_then(Value::as_object_mut)
    {
        let summary_provider = summary_memory
            .get("provider")
            .and_then(Value::as_str)
            .unwrap_or_default();
        let summary_model = summary_memory
            .get("model")
            .and_then(Value::as_str)
            .unwrap_or_default();

        if summary_provider == "ollama"
            && (summary_model.is_empty() || summary_model == deleted_model)
        {
            summary_memory.insert("provider".to_string(), json!("openai"));
            summary_memory.insert("model".to_string(), json!(OPENAI_FALLBACK_MODEL));
            summary_memory.insert("modelPolicy".to_string(), json!("cloudModel"));
        }
    }

    profile["updatedAt"] = json!(timestamp_millis());
    true
}

fn migrate_profiles_from_deleted_model_inner(
    app: AppHandle,
    deleted_model: &str,
) -> Result<Value, String> {
    let mut store = load_assistant_profile_store_inner(app.clone())?;
    let profiles = store
        .get_mut("profiles")
        .and_then(Value::as_array_mut)
        .ok_or_else(|| "Assistant profile store is missing profiles.".to_string())?;

    let mut migrated = 0usize;
    for profile in profiles.iter_mut() {
        if migrate_profile_to_openai(profile, deleted_model) {
            migrated += 1;
        }
    }

    if migrated == 0 {
        return Ok(json!({
            "migrated": 0,
            "provider": "openai",
            "model": OPENAI_FALLBACK_MODEL
        }));
    }

    store["updatedAt"] = json!(timestamp_millis());
    save_assistant_profile_store_inner(app.clone(), store)?;

    let _ = app.emit(
        "assistant-profiles-migrated",
        json!({
            "deletedModel": deleted_model,
            "migrated": migrated,
            "provider": "openai",
            "model": OPENAI_FALLBACK_MODEL
        }),
    );

    Ok(json!({
        "migrated": migrated,
        "provider": "openai",
        "model": OPENAI_FALLBACK_MODEL
    }))
}

fn timestamp_millis() -> String {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_millis().to_string())
        .unwrap_or_else(|_| "0".to_string())
}

fn empty_chat_history_store() -> Value {
    json!({
        "schemaVersion": 2,
        "conversations": {},
        "activeConversationIds": {},
        "summaries": {},
        "updatedAt": null
    })
}

fn chat_history_store_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    Ok(dir.join(CHAT_HISTORY_STORE_FILE))
}

fn normalize_chat_history_store(store: Value) -> Value {
    let conversations = store
        .get("conversations")
        .filter(|value| value.is_object())
        .cloned()
        .unwrap_or_else(|| json!({}));
    let active_conversation_ids = store
        .get("activeConversationIds")
        .filter(|value| value.is_object())
        .cloned()
        .unwrap_or_else(|| json!({}));
    let summaries = store
        .get("summaries")
        .filter(|value| value.is_object())
        .cloned()
        .unwrap_or_else(|| json!({}));

    json!({
        "schemaVersion": 2,
        "conversations": conversations,
        "activeConversationIds": active_conversation_ids,
        "summaries": summaries,
        "updatedAt": store.get("updatedAt").and_then(Value::as_str)
    })
}

fn load_chat_history_store_inner(app: AppHandle) -> Result<Value, String> {
    let path = chat_history_store_path(&app)?;
    if !path.exists() {
        return Ok(empty_chat_history_store());
    }

    let content = fs::read_to_string(path).map_err(|error| error.to_string())?;
    if content.trim().is_empty() {
        return Ok(empty_chat_history_store());
    }

    let store = serde_json::from_str::<Value>(&content).map_err(|error| error.to_string())?;
    Ok(normalize_chat_history_store(store))
}

fn save_chat_history_store_inner(app: AppHandle, store: Value) -> Result<Value, String> {
    let path = chat_history_store_path(&app)?;
    let normalized = normalize_chat_history_store(store);
    let content = serde_json::to_string_pretty(&normalized).map_err(|error| error.to_string())?;
    fs::write(path, content).map_err(|error| error.to_string())?;
    Ok(normalized)
}

fn delete_runtime_chat_messages_inner(
    app: AppHandle,
    assistant_id: String,
) -> Result<Value, String> {
    let mut store = load_chat_history_store_inner(app.clone())?;
    if let Some(conversations) = store
        .get_mut("conversations")
        .and_then(Value::as_object_mut)
    {
        conversations.retain(|_, conversation| {
            conversation
                .get("assistantId")
                .and_then(Value::as_str)
                .map(|value| value != assistant_id)
                .unwrap_or(true)
        });
    }
    if let Some(active_conversation_ids) = store
        .get_mut("activeConversationIds")
        .and_then(Value::as_object_mut)
    {
        active_conversation_ids.remove(&assistant_id);
    }
    if let Some(summaries) = store.get_mut("summaries").and_then(Value::as_object_mut) {
        summaries.remove(&assistant_id);
    }
    store["updatedAt"] = Value::String(timestamp_millis());
    save_chat_history_store_inner(app, store)
}

fn allowed_model(model: &str) -> bool {
    ALLOWED_MODELS.contains(&model)
}

fn ollama_candidates() -> Vec<String> {
    let mut candidates = Vec::new();

    if let Ok(value) = env::var("OLLAMA_BIN") {
        candidates.push(value);
    }

    candidates.push("ollama".to_string());

    if let Ok(value) = env::var("LOCALAPPDATA") {
        candidates.push(format!(r"{value}\Programs\Ollama\ollama.exe"));
    }

    if let Ok(value) = env::var("PROGRAMFILES") {
        candidates.push(format!(r"{value}\Ollama\ollama.exe"));
    }

    candidates
}

fn detect_ollama_cli() -> (bool, Option<String>, Option<String>, Option<String>) {
    let mut last_error = None;

    for candidate in ollama_candidates() {
        let mut command = Command::new(&candidate);
        command.arg("--version");
        hide_console_window(&mut command);
        match command.output() {
            Ok(output) if output.status.success() => {
                let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
                let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
                let version = if stdout.is_empty() { stderr } else { stdout };
                return (true, Some(candidate), Some(version), None);
            }
            Ok(output) => {
                last_error = Some(String::from_utf8_lossy(&output.stderr).trim().to_string());
            }
            Err(error) => {
                last_error = Some(error.to_string());
            }
        }
    }

    (false, None, None, last_error)
}

fn get_installed_models() -> Result<Vec<String>, String> {
    let client = Client::builder()
        .timeout(Duration::from_secs(5))
        .build()
        .map_err(|error| error.to_string())?;

    let response = client
        .get(format!("{OLLAMA_BASE_URL}/api/tags"))
        .send()
        .map_err(|error| error.to_string())?;

    if !response.status().is_success() {
        return Err(format!("Ollama returned HTTP {}", response.status()));
    }

    let tags = response
        .json::<TagsResponse>()
        .map_err(|error| error.to_string())?;

    Ok(tags
        .models
        .into_iter()
        .filter_map(|model| model.name.or(model.model))
        .collect())
}

fn get_ollama_status_inner() -> OllamaStatus {
    let (installed, command, version, cli_error) = detect_ollama_cli();

    match get_installed_models() {
        Ok(models) => OllamaStatus {
            installed,
            running: true,
            command,
            version,
            installed_model_count: models.len(),
            installed_models: models,
            base_url: OLLAMA_BASE_URL.to_string(),
            error: None,
        },
        Err(error) => OllamaStatus {
            installed,
            running: false,
            command,
            version,
            installed_model_count: 0,
            installed_models: Vec::new(),
            base_url: OLLAMA_BASE_URL.to_string(),
            error: Some(error).or(cli_error),
        },
    }
}

fn model_names_match(left: &str, right: &str) -> bool {
    let left = left.trim().to_lowercase();
    let right = right.trim().to_lowercase();
    if left.is_empty() || right.is_empty() {
        return false;
    }
    if left == right {
        return true;
    }

    left.starts_with(&format!("{right}:")) || right.starts_with(&format!("{left}:"))
}

fn resolve_installed_model_name(requested: &str, installed: &[String]) -> Option<String> {
    installed
        .iter()
        .find(|name| model_names_match(name, requested))
        .cloned()
}

fn is_allowed_model(model: &str) -> bool {
    ALLOWED_MODELS.iter().any(|allowed| model_names_match(allowed, model))
}

fn wait_until_model_removed(model: &str) -> Result<(), String> {
    for _ in 0..6 {
        let installed = get_installed_models()?;
        if resolve_installed_model_name(model, &installed).is_none() {
            return Ok(());
        }
        thread::sleep(Duration::from_millis(300));
    }

    Err(format!("Model {model} is still present after delete."))
}

fn delete_ollama_model_inner(model: &str) -> Result<Value, String> {
    let status = get_ollama_status_inner();
    if !status.running {
        return Err("Ollama is not running.".to_string());
    }

    let resolved_model = match resolve_installed_model_name(model, &status.installed_models) {
        Some(resolved) => resolved,
        None => {
            return Ok(json!({
                "ok": true,
                "model": model,
                "alreadyRemoved": true
            }));
        }
    };

    let client = Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|error| error.to_string())?;

    let response = client
        .delete(format!("{OLLAMA_BASE_URL}/api/delete"))
        .json(&json!({ "model": resolved_model }))
        .send()
        .map_err(|error| error.to_string())?;

    if !response.status().is_success() {
        return Err(format!(
            "Ollama returned HTTP {} while deleting {resolved_model}.",
            response.status()
        ));
    }

    wait_until_model_removed(model)?;

    Ok(json!({
        "ok": true,
        "model": model,
        "resolvedModel": resolved_model
    }))
}

fn run_command_to_string(mut command: Command) -> Result<String, String> {
    hide_console_window(&mut command);
    let output = command.output().map_err(|error| error.to_string())?;
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let combined = [stdout, stderr]
        .into_iter()
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join("\n");

    if output.status.success() {
        Ok(if combined.is_empty() {
            "Command completed.".to_string()
        } else {
            combined
        })
    } else {
        Err(if combined.is_empty() {
            format!("Command failed with status {}", output.status)
        } else {
            combined
        })
    }
}

fn command_version(program: &str, args: &[&str]) -> Option<String> {
    let mut command = Command::new(program);
    command.args(args);
    hide_console_window(&mut command);
    let output = command.output().ok()?;
    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let version = if stdout.is_empty() { stderr } else { stdout };
    if version.is_empty() {
        None
    } else {
        Some(version)
    }
}

fn parse_python_version(value: &str) -> Option<(u32, u32, u32)> {
    let token = value.split_whitespace().find(|part| {
        part.chars()
            .next()
            .is_some_and(|character| character.is_ascii_digit())
    })?;
    let mut parts = token.split('.');
    let major = parts.next()?.parse::<u32>().ok()?;
    let minor = parts.next().unwrap_or("0").parse::<u32>().ok()?;
    let patch = parts.next().unwrap_or("0").parse::<u32>().ok()?;
    Some((major, minor, patch))
}

fn python_312_candidates() -> Vec<(String, Vec<String>)> {
    let mut candidates = Vec::new();

    if let Ok(value) = env::var("MIVA_PYTHON_BIN") {
        if !value.trim().is_empty() {
            candidates.push((value, Vec::new()));
        }
    }

    candidates.push(("py".to_string(), vec!["-3.12".to_string()]));

    if let Ok(value) = env::var("LOCALAPPDATA") {
        candidates.push((
            PathBuf::from(value)
                .join("Programs")
                .join("Python")
                .join("Python312")
                .join("python.exe")
                .to_string_lossy()
                .to_string(),
            Vec::new(),
        ));
    }

    if let Ok(value) = env::var("USERPROFILE") {
        for distribution in ["miniforge3", "miniconda3", "anaconda3"] {
            candidates.push((
                PathBuf::from(&value)
                    .join(distribution)
                    .join("python.exe")
                    .to_string_lossy()
                    .to_string(),
                Vec::new(),
            ));
        }
    }

    candidates.push(("python".to_string(), Vec::new()));
    candidates.push(("python3".to_string(), Vec::new()));
    candidates
}

fn inspect_python_candidate(program: &str, args_prefix: &[String]) -> Option<(String, String)> {
    let mut command = Command::new(program);
    command.args(args_prefix);
    command.args([
        "-c",
        "import platform,sys; print(sys.executable); print(platform.python_version())",
    ]);
    hide_console_window(&mut command);
    let output = command.output().ok()?;

    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut lines = stdout.lines().map(str::trim).filter(|line| !line.is_empty());
    let executable = lines.next()?.to_string();
    let version = lines.next()?.to_string();
    Some((executable, version))
}

fn detect_python_requirement() -> RuntimeRequirement {
    for (program, args_prefix) in python_312_candidates() {
        if let Some((executable, version)) = inspect_python_candidate(&program, &args_prefix) {
            let compatible = parse_python_version(&version)
                .is_some_and(|(major, minor, _)| major == 3 && minor == 12);
            if !compatible {
                continue;
            }
            return RuntimeRequirement {
                id: "python".to_string(),
                label: "Python 3.12".to_string(),
                required_for:
                    "Kokoro TTS, local STT helpers, and optional Python tools."
                        .to_string(),
                installed: true,
                meets_minimum: true,
                command: Some(executable),
                version: Some(version),
                note: "Python 3.12 is ready for Kokoro TTS.".to_string(),
            };
        }
    }

    RuntimeRequirement {
        id: "python".to_string(),
        label: "Python 3.12".to_string(),
        required_for: "Kokoro TTS, local STT helpers, and optional Python tools.".to_string(),
        installed: false,
        meets_minimum: false,
        command: None,
        version: None,
        note: "Python 3.12 was not detected. Install it before setting up Kokoro TTS.".to_string(),
    }
}

fn get_runtime_requirements_inner() -> RuntimeRequirements {
    RuntimeRequirements {
        python: detect_python_requirement(),
    }
}

fn emit_live2d_install_progress(
    app: &AppHandle,
    status: impl Into<String>,
    completed: u64,
    total: u64,
    done: bool,
    error: Option<String>,
) {
    let percent = if total > 0 {
        ((completed.min(total) as f64 / total as f64) * 1000.0).round() / 10.0
    } else if done {
        100.0
    } else {
        0.0
    };

    let _ = app.emit(
        "live2d-install-progress",
        Live2DInstallProgress {
            status: status.into(),
            completed,
            total,
            percent,
            done,
            error,
        },
    );
}

fn live2d_dev_models_dir() -> Option<PathBuf> {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .and_then(|desktop_dir| desktop_dir.parent())
        .and_then(|apps_dir| apps_dir.parent())
        .map(|repo_dir| {
            repo_dir
                .join("VtuberLLM")
                .join("Open-LLM-VTuber-main")
                .join("live2d-models")
        })
        .filter(|path| path.exists())
}

fn live2d_resource_models_dir(app: &AppHandle) -> Option<PathBuf> {
    app.path().resource_dir().ok().and_then(|dir| {
        [
            dir.join("bundle-resources").join("live2d-models"),
            dir.join("live2d-models"),
        ]
        .into_iter()
        .find(|path| path.exists())
    })
}

fn live2d_dev_core_script_path() -> Option<PathBuf> {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .and_then(|desktop_dir| desktop_dir.parent())
        .and_then(|apps_dir| apps_dir.parent())
        .map(|repo_dir| {
            repo_dir
                .join("VtuberLLM")
                .join("Open-LLM-VTuber-main")
                .join("frontend-source")
                .join("libs")
                .join("live2dcubismcore.min.js")
        })
        .filter(|path| path.exists())
}

fn live2d_resource_core_script_path(app: &AppHandle) -> Option<PathBuf> {
    app.path().resource_dir().ok().and_then(|dir| {
        [
            dir.join("bundle-resources").join("live2dcubismcore.min.js"),
            dir.join("live2dcubismcore.min.js"),
        ]
        .into_iter()
        .find(|path| path.exists())
    })
}

fn live2d_source_core_script_path(app: &AppHandle) -> Option<PathBuf> {
    live2d_resource_core_script_path(app).or_else(live2d_dev_core_script_path)
}

fn live2d_source_models_dir(app: &AppHandle) -> Result<PathBuf, String> {
    live2d_resource_models_dir(app)
        .or_else(live2d_dev_models_dir)
        .ok_or_else(|| "Bundled Live2D model resources were not found.".to_string())
}

fn live2d_runtime_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join("live2d-runtime");
    fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    Ok(dir)
}

fn live2d_install_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join("live2d-runtime")
        .join("live2d-models");
    fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    Ok(dir)
}

fn live2d_core_install_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = live2d_runtime_dir(app)?.join("libs");
    fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    Ok(dir.join("live2dcubismcore.min.js"))
}

fn count_files(path: &Path) -> Result<u64, String> {
    if path.is_file() {
        return Ok(1);
    }

    let mut total = 0;
    for entry in fs::read_dir(path).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let entry_path = entry.path();
        if entry_path.is_dir() {
            total += count_files(&entry_path)?;
        } else if entry_path.is_file() {
            total += 1;
        }
    }
    Ok(total)
}

fn copy_dir_with_progress(
    app: &AppHandle,
    source: &Path,
    target: &Path,
    copied: &mut u64,
    total: u64,
) -> Result<(), String> {
    fs::create_dir_all(target).map_err(|error| error.to_string())?;

    for entry in fs::read_dir(source).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let source_path = entry.path();
        let target_path = target.join(entry.file_name());

        if source_path.is_dir() {
            copy_dir_with_progress(app, &source_path, &target_path, copied, total)?;
        } else if source_path.is_file() {
            fs::copy(&source_path, &target_path).map_err(|error| error.to_string())?;
            *copied += 1;
            emit_live2d_install_progress(
                app,
                format!(
                    "Copying {}",
                    source_path
                        .file_name()
                        .and_then(|name| name.to_str())
                        .unwrap_or("asset")
                ),
                *copied,
                total,
                false,
                None,
            );
        }
    }

    Ok(())
}

fn verify_live2d_model(model_dir: &Path) -> bool {
    let runtime_dir = model_dir.join("runtime");
    fs::read_dir(runtime_dir)
        .ok()
        .map(|entries| {
            entries.filter_map(Result::ok).any(|entry| {
                entry
                    .path()
                    .extension()
                    .and_then(|extension| extension.to_str())
                    .is_some_and(|extension| extension.eq_ignore_ascii_case("json"))
                    && entry
                        .file_name()
                        .to_string_lossy()
                        .ends_with(".model3.json")
            })
        })
        .unwrap_or(false)
}

fn dir_size_bytes(path: &Path) -> Result<u64, String> {
    if path.is_file() {
        return fs::metadata(path)
            .map(|metadata| metadata.len())
            .map_err(|error| error.to_string());
    }

    let mut total = 0;
    if !path.exists() {
        return Ok(0);
    }
    for entry in fs::read_dir(path).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let entry_path = entry.path();
        total += dir_size_bytes(&entry_path)?;
    }
    Ok(total)
}

fn live2d_runtime_status_inner(app: AppHandle) -> Result<Live2DInstallResult, String> {
    let install_root = live2d_install_dir(&app)?;
    let core_script_path = live2d_core_install_path(&app)?;
    let installed_models = LIVE2D_MODEL_DIRS
        .into_iter()
        .filter(|model| verify_live2d_model(&install_root.join(model)))
        .map(String::from)
        .collect::<Vec<_>>();
    let core_ready = core_script_path.exists();
    let total_size_mb = ((dir_size_bytes(&live2d_runtime_dir(&app)?)? as f64 / 1024.0 / 1024.0) * 100.0).round() / 100.0;

    Ok(Live2DInstallResult {
        install_dir: live2d_runtime_dir(&app)?.to_string_lossy().to_string(),
        model_base_dir: install_root.to_string_lossy().to_string(),
        core_script_path: core_ready.then(|| core_script_path.to_string_lossy().to_string()),
        installed_models,
        total_size_mb,
        ready: core_ready && LIVE2D_MODEL_DIRS
            .into_iter()
            .any(|model| verify_live2d_model(&install_root.join(model))),
    })
}

fn install_live2d_runtime_inner(app: AppHandle) -> Result<Live2DInstallResult, String> {
    emit_live2d_install_progress(&app, "Locating bundled Live2D assets", 0, 100, false, None);

    let source_root = live2d_source_models_dir(&app).map_err(|error| {
        emit_live2d_install_progress(&app, "Install failed", 0, 100, true, Some(error.clone()));
        error
    })?;
    let install_root = live2d_install_dir(&app).map_err(|error| {
        emit_live2d_install_progress(&app, "Install failed", 0, 100, true, Some(error.clone()));
        error
    })?;
    let core_source = live2d_source_core_script_path(&app);
    let core_target = live2d_core_install_path(&app).map_err(|error| {
        emit_live2d_install_progress(&app, "Install failed", 0, 100, true, Some(error.clone()));
        error
    })?;

    let mut total_files = 0;
    for model in LIVE2D_MODEL_DIRS {
        let model_source = source_root.join(model);
        if model_source.exists() {
            total_files += count_files(&model_source)?;
        }
    }
    if core_source.is_some() {
        total_files += 1;
    }

    if total_files == 0 {
        let message = "No bundled Live2D model files were found.".to_string();
        emit_live2d_install_progress(&app, "Install failed", 0, 100, true, Some(message.clone()));
        return Err(message);
    }

    emit_live2d_install_progress(
        &app,
        "Copying bundled Live2D models",
        0,
        total_files,
        false,
        None,
    );

    let mut copied = 0;
    if let Some(core_source) = core_source {
        fs::copy(&core_source, &core_target).map_err(|error| error.to_string())?;
        copied += 1;
        emit_live2d_install_progress(
            &app,
            "Copying Cubism Core runtime",
            copied,
            total_files,
            false,
            None,
        );
    }

    for model in LIVE2D_MODEL_DIRS {
        let model_source = source_root.join(model);
        if model_source.exists() {
            copy_dir_with_progress(
                &app,
                &model_source,
                &install_root.join(model),
                &mut copied,
                total_files,
            )?;
        }
    }

    emit_live2d_install_progress(
        &app,
        "Verifying copied Live2D models",
        copied,
        total_files,
        false,
        None,
    );
    let installed_models = LIVE2D_MODEL_DIRS
        .into_iter()
        .filter(|model| verify_live2d_model(&install_root.join(model)))
        .map(String::from)
        .collect::<Vec<_>>();

    if installed_models.is_empty() {
        let message = "Live2D files copied, but no valid model3.json files were found.".to_string();
        emit_live2d_install_progress(
            &app,
            "Install failed",
            copied,
            total_files,
            true,
            Some(message.clone()),
        );
        return Err(message);
    }

    let manifest_path = install_root
        .parent()
        .unwrap_or(&install_root)
        .join("install-manifest.json");
    let manifest = json!({
        "schemaVersion": 1,
        "installedAt": timestamp_millis(),
        "installDir": live2d_runtime_dir(&app)?.to_string_lossy(),
        "modelBaseDir": install_root.to_string_lossy(),
        "coreScriptPath": core_target.exists().then(|| core_target.to_string_lossy().to_string()),
        "models": installed_models
    });
    let manifest_content =
        serde_json::to_string_pretty(&manifest).map_err(|error| error.to_string())?;
    fs::write(manifest_path, manifest_content).map_err(|error| error.to_string())?;

    emit_live2d_install_progress(
        &app,
        "Live2D runtime ready",
        total_files,
        total_files,
        true,
        None,
    );

    live2d_runtime_status_inner(app)
}

fn default_python_install_dir_inner() -> String {
    env::var("LOCALAPPDATA")
        .map(|value| {
            PathBuf::from(value)
                .join("Programs")
                .join("Python")
                .join("Python312")
        })
        .unwrap_or_else(|_| PathBuf::from(r"C:\Python312"))
        .to_string_lossy()
        .to_string()
}

fn install_python_inner(target_dir: Option<String>) -> Result<String, String> {
    let current = detect_python_requirement();
    if current.meets_minimum {
        return Ok("Python 3.12 is already installed.".to_string());
    }

    let install_dir = target_dir
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(default_python_install_dir_inner);

    fs::create_dir_all(&install_dir).map_err(|error| error.to_string())?;

    let mut command = Command::new("winget");
    command.args([
        "install",
        "--id",
        "Python.Python.3.12",
        "--source",
        "winget",
        "--scope",
        "user",
        "--location",
        &install_dir,
        "--accept-package-agreements",
        "--accept-source-agreements",
    ]);

    run_command_to_string(command)
}

fn is_local_helper_running() -> bool {
    TcpStream::connect("127.0.0.1:43110").is_ok()
}

fn local_helper_dev_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .and_then(|desktop_dir| desktop_dir.parent())
        .map(|apps_dir| apps_dir.join("local-helper"))
        .unwrap_or_else(|| PathBuf::from("..").join("local-helper"))
}

fn local_helper_bundled_dir(app: &AppHandle) -> Option<PathBuf> {
    app.path().resource_dir().ok().map(|dir| {
        dir.join("bundle-resources")
            .join("apps")
            .join("local-helper")
    })
}

fn resolve_local_helper_dir(app: &AppHandle) -> PathBuf {
    if let Some(bundled_dir) = local_helper_bundled_dir(app) {
        if bundled_dir.join("package.json").exists() {
            return bundled_dir;
        }
    }

    local_helper_dev_dir()
}

fn resolve_node_command() -> String {
    if let Ok(path) = env::var("MIVA_NODE_PATH") {
        if !path.trim().is_empty() {
            return path;
        }
    }

    if cfg!(windows) {
        let candidates = [
            PathBuf::from(env::var("ProgramFiles").unwrap_or_default())
                .join("nodejs")
                .join("node.exe"),
            PathBuf::from(env::var("ProgramFiles(x86)").unwrap_or_default())
                .join("nodejs")
                .join("node.exe"),
            PathBuf::from(env::var("LOCALAPPDATA").unwrap_or_default())
                .join("Programs")
                .join("nodejs")
                .join("node.exe"),
        ];

        for candidate in candidates {
            if candidate.exists() {
                return candidate.to_string_lossy().to_string();
            }
        }
    }

    "node".to_string()
}

fn start_local_helper_process(app: &AppHandle) -> Option<Child> {
    if is_local_helper_running() {
        return None;
    }

    let helper_dir = resolve_local_helper_dir(app);
    let package_json = helper_dir.join("package.json");
    if !package_json.exists() {
        eprintln!(
            "Local helper package was not found at {}.",
            package_json.display()
        );
        return None;
    }

    let mut command = Command::new(resolve_node_command());
    command
        .args(["src/server.mjs"])
        .current_dir(helper_dir)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    hide_console_window(&mut command);

    match command.spawn() {
        Ok(child) => Some(child),
        Err(error) => {
            eprintln!("Failed to start local helper: {error}");
            None
        }
    }
}

fn bytes_to_gb(bytes: u64) -> f64 {
    let gb = bytes as f64 / 1024.0 / 1024.0 / 1024.0;
    (gb * 10.0).round() / 10.0
}

fn detect_gpu_name() -> Option<String> {
    let mut command = Command::new("powershell");
    command.args([
        "-NoProfile",
        "-Command",
        "(Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name)",
    ]);
    hide_console_window(&mut command);
    let output = command.output().ok()?;

    if !output.status.success() {
        return None;
    }

    String::from_utf8_lossy(&output.stdout)
        .lines()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .find(|value| is_supported_gpu_name(value))
        .map(String::from)
}

fn is_supported_gpu_name(value: &str) -> bool {
    let normalized = value.to_ascii_lowercase();
    let virtual_adapter_patterns = [
        "parsec",
        "virtual",
        "remote",
        "microsoft basic",
        "basic display",
        "displaylink",
        "indirect display",
        "mirror driver",
        "spacedesk",
        "radmin",
        "nomachine",
        "vmware",
        "virtualbox",
        "hyper-v",
    ];

    !virtual_adapter_patterns
        .iter()
        .any(|pattern| normalized.contains(pattern))
}

fn detect_primary_disk_space() -> (f64, f64) {
    let disks = Disks::new_with_refreshed_list();
    let system_drive = env::var("SystemDrive")
        .ok()
        .map(|drive| drive.to_ascii_lowercase());

    let disk = disks
        .iter()
        .find(|disk| {
            system_drive.as_ref().is_some_and(|drive| {
                disk.mount_point()
                    .to_string_lossy()
                    .to_ascii_lowercase()
                    .starts_with(drive)
            })
        })
        .or_else(|| disks.iter().next());

    match disk {
        Some(disk) => (
            bytes_to_gb(disk.total_space()),
            bytes_to_gb(disk.available_space()),
        ),
        None => (0.0, 0.0),
    }
}

fn get_hardware_info_inner() -> HardwareInfo {
    let mut system = System::new_all();
    system.refresh_all();

    let (primary_disk_total_gb, primary_disk_available_gb) = detect_primary_disk_space();

    HardwareInfo {
        cpu_brand: system
            .cpus()
            .first()
            .map(|cpu| cpu.brand().trim().to_string())
            .filter(|value| !value.is_empty()),
        logical_core_count: system.cpus().len(),
        physical_core_count: System::physical_core_count(),
        total_memory_gb: bytes_to_gb(system.total_memory()),
        available_memory_gb: bytes_to_gb(system.available_memory()),
        primary_disk_total_gb,
        primary_disk_available_gb,
        gpu_name: detect_gpu_name(),
        os_name: System::name(),
        os_version: System::long_os_version(),
        arch: env::consts::ARCH.to_string(),
    }
}

fn install_ollama_inner() -> Result<String, String> {
    let status = get_ollama_status_inner();
    if status.installed {
        return Ok("Ollama is already installed.".to_string());
    }

    let mut command = Command::new("winget");
    command.args([
        "install",
        "--id",
        "Ollama.Ollama",
        "--source",
        "winget",
        "--accept-package-agreements",
        "--accept-source-agreements",
    ]);

    run_command_to_string(command)
}

fn start_ollama_inner() -> Result<String, String> {
    let current = get_ollama_status_inner();
    if current.running {
        return Ok("Ollama is already running.".to_string());
    }

    let (installed, command, _, error) = detect_ollama_cli();
    if !installed {
        return Err(error.unwrap_or_else(|| "Ollama CLI was not found.".to_string()));
    }

    let command = command.ok_or_else(|| "Ollama CLI command was not found.".to_string())?;
    let mut serve_command = Command::new(command);
    serve_command
        .arg("serve")
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    hide_console_window(&mut serve_command);
    serve_command
        .spawn()
        .map_err(|error| error.to_string())?;

    thread::sleep(Duration::from_millis(1500));

    if get_ollama_status_inner().running {
        Ok("Ollama started.".to_string())
    } else {
        Err("Ollama start was attempted, but the API is still unavailable.".to_string())
    }
}

fn register_active_pull(model: &str) -> (Arc<AtomicBool>, Arc<AtomicBool>) {
    let cancel = Arc::new(AtomicBool::new(false));
    let pause = Arc::new(AtomicBool::new(false));
    if let Ok(mut guard) = ACTIVE_MODEL_PULL.lock() {
        *guard = Some(ActiveModelPull {
            model: model.to_string(),
            cancel: cancel.clone(),
            pause: pause.clone(),
        });
    }
    (cancel, pause)
}

fn clear_active_pull(model: &str) {
    if let Ok(mut guard) = ACTIVE_MODEL_PULL.lock() {
        if guard
            .as_ref()
            .map(|pull| pull.model == model)
            .unwrap_or(false)
        {
            *guard = None;
        }
    }
}

fn cleanup_cancelled_pull(model: &str) -> Result<(), String> {
    let client = Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|error| error.to_string())?;

    let _ = client
        .post(format!("{LOCAL_HELPER_URL}/models/pull/cancel"))
        .json(&json!({ "model": model }))
        .send();

    if let Err(error) = delete_ollama_model_inner(model) {
        eprintln!("cancelled pull cleanup warning for {model}: {error}");
    }

    Ok(())
}

fn emit_download_progress(
    app: &AppHandle,
    model: &str,
    status: impl Into<String>,
    completed: Option<u64>,
    total: Option<u64>,
    done: bool,
    paused: bool,
    error: Option<String>,
) {
    let percent = match (completed, total) {
        (Some(completed), Some(total)) if total > 0 => {
            Some(((completed as f64 / total as f64) * 1000.0).round() / 10.0)
        }
        _ => None,
    };

    let _ = app.emit(
        "model-download-progress",
        ModelDownloadProgress {
            model: model.to_string(),
            status: status.into(),
            completed,
            total,
            percent,
            done,
            paused,
            error,
        },
    );
}

fn pull_model_inner(app: AppHandle, model: String) -> Result<String, String> {
    if !allowed_model(&model) {
        return Err(format!("{model} is not allowed in Phase 1."));
    }

    let (cancel_flag, pause_flag) = register_active_pull(&model);
    emit_download_progress(
        &app,
        &model,
        "Preparing download",
        None,
        None,
        false,
        false,
        None,
    );

    let client = Client::builder()
        .timeout(Duration::from_secs(60 * 60))
        .build()
        .map_err(|error| error.to_string())?;

    let response = client
        .post(format!("{OLLAMA_BASE_URL}/api/pull"))
        .json(&json!({
            "name": model.as_str(),
            "stream": true
        }))
        .send()
        .map_err(|error| {
            let message = error.to_string();
            clear_active_pull(&model);
            emit_download_progress(
                &app,
                &model,
                "Download failed",
                None,
                None,
                true,
                false,
                Some(message.clone()),
            );
            message
        })?;

    if !response.status().is_success() {
        let message = format!("Ollama returned HTTP {}", response.status());
        clear_active_pull(&model);
        emit_download_progress(
            &app,
            &model,
            "Download failed",
            None,
            None,
            true,
            false,
            Some(message.clone()),
        );
        return Err(message);
    }

    let reader = BufReader::new(response);
    let mut last_status = "Downloading".to_string();
    let mut layer_progress: HashMap<String, (u64, u64)> = HashMap::new();
    let mut last_completed: Option<u64> = None;
    let mut last_total: Option<u64> = None;

    for line in reader.lines() {
        if cancel_flag.load(Ordering::Relaxed) {
            clear_active_pull(&model);
            emit_download_progress(
                &app,
                &model,
                "Download cancelled",
                last_completed,
                last_total,
                true,
                false,
                Some("Download cancelled.".to_string()),
            );
            return Err("Download cancelled.".to_string());
        }

        if pause_flag.load(Ordering::Relaxed) {
            clear_active_pull(&model);
            emit_download_progress(
                &app,
                &model,
                "Download paused",
                last_completed,
                last_total,
                false,
                true,
                None,
            );
            return Ok(format!("{model} download paused."));
        }

        let line = line.map_err(|error| error.to_string())?;
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        let progress = serde_json::from_str::<PullStreamMessage>(trimmed)
            .map_err(|error| format!("Failed to parse Ollama progress: {error}"))?;

        if let Some(error) = progress.error {
            clear_active_pull(&model);
            emit_download_progress(
                &app,
                &model,
                "Download failed",
                progress.completed,
                progress.total,
                true,
                false,
                Some(error.clone()),
            );
            return Err(error);
        }

        if let Some(status) = progress.status {
            last_status = status;
        }

        if let (Some(completed), Some(total)) = (progress.completed, progress.total) {
            if total > 0 {
                let key = progress
                    .digest
                    .clone()
                    .unwrap_or_else(|| last_status.clone());
                layer_progress.insert(key, (completed, total));
            }
        }

        let (aggregate_completed, aggregate_total) = layer_progress.values().fold(
            (0_u64, 0_u64),
            |(completed_sum, total_sum), (completed, total)| {
                (completed_sum + completed.min(total), total_sum + total)
            },
        );

        let completed = if aggregate_total > 0 {
            Some(aggregate_completed)
        } else {
            progress.completed
        };
        let total = if aggregate_total > 0 {
            Some(aggregate_total)
        } else {
            progress.total
        };
        last_completed = completed;
        last_total = total;

        let done = last_status.eq_ignore_ascii_case("success");
        emit_download_progress(
            &app,
            &model,
            last_status.clone(),
            completed,
            total,
            done,
            false,
            None,
        );
    }

    let (aggregate_completed, aggregate_total) = layer_progress.values().fold(
        (0_u64, 0_u64),
        |(completed_sum, total_sum), (completed, total)| {
            (completed_sum + completed.min(total), total_sum + total)
        },
    );
    let completed = if aggregate_total > 0 {
        Some(aggregate_completed)
    } else {
        None
    };
    let total = if aggregate_total > 0 {
        Some(aggregate_total)
    } else {
        None
    };

    clear_active_pull(&model);
    emit_download_progress(
        &app,
        &model,
        "Download complete",
        completed,
        total,
        true,
        false,
        None,
    );

    Ok(format!("{model} downloaded."))
}

fn pause_model_pull_inner(model: &str) -> Result<String, String> {
    let guard = ACTIVE_MODEL_PULL
        .lock()
        .map_err(|error| error.to_string())?;
    let pull = guard
        .as_ref()
        .ok_or_else(|| "No active download.".to_string())?;
    if pull.model != model {
        return Err("No active download for that model.".to_string());
    }

    pull.pause.store(true, Ordering::Relaxed);
    Ok(format!("{model} download paused."))
}

fn cancel_model_pull_inner(model: &str) -> Result<String, String> {
    let cancel = {
        let guard = ACTIVE_MODEL_PULL
            .lock()
            .map_err(|error| error.to_string())?;
        let pull = guard
            .as_ref()
            .ok_or_else(|| "No active download.".to_string())?;
        if pull.model != model {
            return Err("No active download for that model.".to_string());
        }
        pull.cancel.clone()
    };

    cancel.store(true, Ordering::Relaxed);
    for _ in 0..30 {
        let still_active = ACTIVE_MODEL_PULL
            .lock()
            .ok()
            .and_then(|guard| guard.as_ref().map(|pull| pull.model == model))
            .unwrap_or(false);
        if !still_active {
            break;
        }
        thread::sleep(Duration::from_millis(100));
    }
    cleanup_cancelled_pull(model)?;
    Ok(format!("{model} download cancelled."))
}

fn build_personalization_prompt_lines(profile: Option<&Value>) -> Vec<String> {
    let Some(personalization) = profile.and_then(|value| value.get("personalization")) else {
        return Vec::new();
    };

    let mut lines = Vec::new();
    match personalization.get("baseStyle").and_then(Value::as_str) {
        Some("concise") => lines.push("Global personalization: prefer concise, direct answers with minimal setup.".to_string()),
        Some("balanced") => lines.push("Global personalization: use a balanced style with a direct answer followed by useful context.".to_string()),
        Some("detailed") => lines.push("Global personalization: include more detail, steps, and tradeoffs when the topic benefits from explanation.".to_string()),
        Some("professional") => lines.push("Global personalization: use a polished, professional tone suitable for work contexts.".to_string()),
        _ => {}
    }
    match personalization.get("warmth").and_then(Value::as_str) {
        Some("warmer") => lines.push("Global personalization: sound warmer and more approachable while staying practical.".to_string()),
        Some("neutral") => lines.push("Global personalization: keep warmth neutral and avoid overly familiar wording.".to_string()),
        Some("direct") => lines.push("Global personalization: be direct and avoid unnecessary softening phrases.".to_string()),
        _ => {}
    }
    match personalization.get("enthusiasm").and_then(Value::as_str) {
        Some("more") => lines.push("Global personalization: use moderately more enthusiastic wording when appropriate.".to_string()),
        Some("balanced") => lines.push("Global personalization: keep enthusiasm balanced and task-focused.".to_string()),
        Some("less") => lines.push("Global personalization: keep enthusiasm low and avoid excited language.".to_string()),
        _ => {}
    }
    match personalization.get("headingsAndLists").and_then(Value::as_str) {
        Some("more") => lines.push("Global personalization: use headings, bullets, and numbered lists more often for scanability.".to_string()),
        Some("balanced") => lines.push("Global personalization: use headings and lists when they materially improve readability.".to_string()),
        Some("minimal") => lines.push("Global personalization: avoid headings and long lists unless the user asks or the answer is complex.".to_string()),
        _ => {}
    }
    match personalization.get("emojiUse").and_then(Value::as_str) {
        Some("none") => lines.push("Global personalization: do not use emoji unless the user explicitly asks.".to_string()),
        Some("sparse") => lines.push("Global personalization: use emoji rarely, only when it adds clear tone or meaning.".to_string()),
        Some("expressive") => lines.push("Global personalization: emoji are allowed for casual answers, but keep them relevant and not excessive.".to_string()),
        _ => {}
    }
    if let Some(custom_instructions) = personalization
        .get("customInstructions")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        lines.push(format!(
            "Global custom instructions for all conversations:\n{custom_instructions}"
        ));
    }

    lines
}

fn prompt_assistant_name(profile: Option<&Value>) -> String {
    profile
        .and_then(|value| value.pointer("/prompt/settings/character"))
        .filter(|character| {
            character
                .get("enabled")
                .and_then(Value::as_bool)
                .unwrap_or(false)
        })
        .and_then(|character| character.get("displayName"))
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or("MiVA")
        .to_string()
}

fn chat_ollama_direct_inner(
    model: String,
    prompt: String,
    locale: String,
    profile: Option<Value>,
) -> Result<String, String> {
    if !allowed_model(&model) {
        return Err(format!("{model} is not allowed in Phase 1."));
    }

    let assistant_name = prompt_assistant_name(profile.as_ref());
    let mut system_prompt = if locale == "ko" {
        format!("You are {assistant_name}, the user's local personal AI assistant. Reply in natural Korean unless the user asks otherwise. Do not mix in unrelated languages. Keep answers short and practical. Format normal answers as GitHub Flavored Markdown, using headings, lists, blockquotes, and fenced code blocks with language labels when helpful.")
    } else {
        format!("You are {assistant_name}, the user's local personal AI assistant. Reply in English. Keep answers short and practical. Format normal answers as GitHub Flavored Markdown, using headings, lists, blockquotes, and fenced code blocks with language labels when helpful.")
    };
    let personalization_lines = build_personalization_prompt_lines(profile.as_ref());
    if !personalization_lines.is_empty() {
        system_prompt.push('\n');
        system_prompt.push_str(&personalization_lines.join("\n"));
    }

    let client = Client::builder()
        .timeout(Duration::from_secs(180))
        .build()
        .map_err(|error| error.to_string())?;

    let response = client
        .post(format!("{OLLAMA_BASE_URL}/api/chat"))
        .json(&json!({
            "model": model,
            "stream": false,
            "messages": [
                { "role": "system", "content": system_prompt },
                { "role": "user", "content": prompt }
            ]
        }))
        .send()
        .map_err(|error| error.to_string())?;

    let status = response.status();
    if !status.is_success() {
        let text = response.text().map_err(|error| error.to_string())?;
        return Err(http_status_error("Ollama", status, &text));
    }

    let chat = response
        .json::<ChatResponse>()
        .map_err(|error| error.to_string())?;

    chat.message
        .map(|message| message.content)
        .filter(|content| !content.trim().is_empty())
        .ok_or_else(|| "Ollama returned an empty response.".to_string())
}

fn chat_via_local_helper(
    provider: String,
    model: String,
    prompt: String,
    locale: String,
    api_key: Option<String>,
    auth_token: Option<String>,
    profile: Option<Value>,
    messages: Option<Value>,
    memory_summary: Option<String>,
    tool_context: Option<String>,
    image_attachments: Option<Value>,
) -> Result<String, String> {
    let client = Client::builder()
        .timeout(Duration::from_secs(180))
        .build()
        .map_err(|error| error.to_string())?;

    let mut body = json!({
        "provider": provider,
        "model": model,
        "prompt": prompt,
        "locale": locale,
        "stream": false
    });

    if let Some(api_key) = api_key.filter(|key| !key.trim().is_empty()) {
        body["apiKey"] = json!(api_key);
    }

    if let Some(auth_token) = auth_token.filter(|token| !token.trim().is_empty()) {
        body["authToken"] = json!(auth_token);
    }

    if let Some(profile) = profile {
        body["profile"] = profile;
    }

    if let Some(messages) = messages {
        body["messages"] = messages;
    }

    if let Some(memory_summary) = memory_summary.filter(|value| !value.trim().is_empty()) {
        body["memorySummary"] = json!(memory_summary);
    }

    if let Some(tool_context) = tool_context.filter(|value| !value.trim().is_empty()) {
        body["toolContext"] = json!(tool_context);
    }

    if let Some(image_attachments) = image_attachments {
        body["imageAttachments"] = image_attachments;
    }

    let response = client
        .post(format!("{LOCAL_HELPER_URL}/chat"))
        .json(&body)
        .send()
        .map_err(|error| error.to_string())?;

    let status = response.status();
    let text = response.text().map_err(|error| error.to_string())?;
    if !status.is_success() {
        return Err(format!("Local helper returned HTTP {status}: {text}"));
    }

    let chat = serde_json::from_str::<HelperChatResponse>(&text)
        .map_err(|error| format!("Failed to parse local helper chat response: {error}"))?;

    chat.answer
        .filter(|answer| !answer.trim().is_empty())
        .or(chat.message)
        .filter(|answer| !answer.trim().is_empty())
        .ok_or_else(|| {
            chat.error
                .unwrap_or_else(|| "Local helper returned an empty response.".to_string())
        })
}

fn request_local_helper_json_once(
    method: &str,
    path: &str,
    body: Option<Value>,
) -> Result<Value, String> {
    let timeout = match path {
        "/voice/install-kokoro" => Duration::from_secs(12 * 60),
        "/voice/tts" => Duration::from_secs(4 * 60),
        _ => Duration::from_secs(30),
    };
    let client = Client::builder()
        .timeout(timeout)
        .build()
        .map_err(|error| error.to_string())?;

    let url = format!("{LOCAL_HELPER_URL}{path}");
    let response = match method {
        "GET" => client.get(url),
        "POST" => {
            let mut request = client.post(url);
            if let Some(body) = body {
                request = request.json(&body);
            }
            request
        }
        other => return Err(format!("Unsupported local helper method: {other}")),
    }
    .send()
    .map_err(|error| error.to_string())?;

    let status = response.status();
    let text = response.text().map_err(|error| error.to_string())?;
    if !status.is_success() {
        return Err(format!("Local helper returned HTTP {status}: {text}"));
    }

    serde_json::from_str::<Value>(&text)
        .map_err(|error| format!("Failed to parse local helper response: {error}"))
}

fn request_local_helper_json(
    method: &str,
    path: &str,
    body: Option<Value>,
) -> Result<Value, String> {
    const RETRY_DELAYS_MS: [u64; 4] = [0, 500, 1000, 2000];
    let mut last_error = String::new();

    for delay_ms in RETRY_DELAYS_MS {
        if delay_ms > 0 {
            thread::sleep(Duration::from_millis(delay_ms));
        }

        match request_local_helper_json_once(method, path, body.clone()) {
            Ok(value) => return Ok(value),
            Err(error) => {
                let retryable = error.contains("connection")
                    || error.contains("refused")
                    || error.contains("connect")
                    || error.contains("timed out");
                last_error = error;
                if !retryable {
                    return Err(last_error);
                }
            }
        }
    }

    Err(format!(
        "Local helper is not responding on {LOCAL_HELPER_URL}. Keep MiVA Desktop open and make sure Node.js is installed. ({last_error})"
    ))
}

fn get_claw_code_status_inner() -> Result<Value, String> {
    request_local_helper_json("GET", "/claw-code/status", None)
}

fn install_claw_code_inner(workspace_root: Option<String>) -> Result<Value, String> {
    let mut body = json!({});
    if let Some(workspace_root) = workspace_root.filter(|value| !value.trim().is_empty()) {
        body["workspaceRoot"] = json!(workspace_root);
    }

    request_local_helper_json("POST", "/claw-code/install", Some(body))
}

fn set_claw_code_workspace_inner(workspace_root: String) -> Result<Value, String> {
    let trimmed = workspace_root.trim();
    if trimmed.is_empty() {
        return Err("Workspace folder is required.".to_string());
    }

    request_local_helper_json(
        "POST",
        "/claw-code/workspace",
        Some(json!({ "workspaceRoot": trimmed })),
    )
}

fn chat_once_inner(
    provider: String,
    model: String,
    prompt: String,
    locale: String,
    api_key: Option<String>,
    auth_token: Option<String>,
    profile: Option<Value>,
    messages: Option<Value>,
    memory_summary: Option<String>,
    tool_context: Option<String>,
    image_attachments: Option<Value>,
) -> Result<String, String> {
    let normalized_provider = if provider.trim().is_empty() {
        "ollama".to_string()
    } else {
        provider
    };

    let profile_for_fallback = profile.clone();

    match chat_via_local_helper(
        normalized_provider.clone(),
        model.clone(),
        prompt.clone(),
        locale.clone(),
        api_key,
        auth_token,
        profile,
        messages,
        memory_summary,
        tool_context,
        image_attachments,
    ) {
        Ok(answer) => Ok(answer),
        Err(error) if normalized_provider == "ollama" => {
            eprintln!("Local helper chat failed, falling back to direct Ollama: {error}");
            chat_ollama_direct_inner(model, prompt, locale, profile_for_fallback)
        }
        Err(error) => Err(error),
    }
}

fn image_mime_type(path: &Path) -> Option<&'static str> {
    match path
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.to_ascii_lowercase())
        .as_deref()
    {
        Some("png") => Some("image/png"),
        Some("jpg") | Some("jpeg") => Some("image/jpeg"),
        Some("webp") => Some("image/webp"),
        Some("gif") => Some("image/gif"),
        _ => None,
    }
}

fn read_image_attachment_inner(path: String) -> Result<Value, String> {
    let file_path = PathBuf::from(path.trim());
    if !file_path.is_file() {
        return Err("Image file was not found.".to_string());
    }

    let mime_type = image_mime_type(&file_path).ok_or_else(|| {
        "Unsupported image type. Use PNG, JPEG, WEBP, or GIF.".to_string()
    })?;
    let metadata = fs::metadata(&file_path).map_err(|error| error.to_string())?;
    if metadata.len() > MAX_IMAGE_ATTACHMENT_BYTES {
        return Err("Image is too large. Maximum size is 20 MB.".to_string());
    }

    let bytes = fs::read(&file_path).map_err(|error| error.to_string())?;
    let name = file_path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("image")
        .to_string();

    Ok(json!({
        "name": name,
        "mimeType": mime_type,
        "dataBase64": STANDARD.encode(bytes),
        "sizeBytes": metadata.len(),
    }))
}

fn analyze_document_inner(path: String) -> Result<Value, String> {
    let client = Client::builder()
        .timeout(Duration::from_secs(600))
        .build()
        .map_err(|error| error.to_string())?;

    let response = client
        .post(format!("{LOCAL_HELPER_URL}/documents/analyze"))
        .json(&json!({ "path": path }))
        .send()
        .map_err(|error| error.to_string())?;

    let status = response.status();
    let text = response.text().map_err(|error| error.to_string())?;
    if !status.is_success() {
        return Err(format!("Local helper returned HTTP {status}: {text}"));
    }

    let result = serde_json::from_str::<Value>(&text)
        .map_err(|error| format!("Failed to parse document analysis response: {error}"))?;
    if result.get("ok").and_then(Value::as_bool) != Some(true) {
        let message = result
            .get("message")
            .and_then(Value::as_str)
            .or_else(|| result.get("error").and_then(Value::as_str))
            .unwrap_or("Document analysis failed.");
        return Err(message.to_string());
    }

    Ok(result)
}

fn http_json_response(status: &str, body: serde_json::Value) -> String {
    let body = serde_json::to_string_pretty(&body).unwrap_or_else(|_| "{}".to_string());
    format!(
        "HTTP/1.1 {status}\r\ncontent-type: application/json; charset=utf-8\r\ncontent-length: {}\r\naccess-control-allow-origin: *\r\naccess-control-allow-methods: GET,POST,OPTIONS\r\naccess-control-allow-headers: content-type\r\naccess-control-allow-private-network: true\r\nconnection: close\r\n\r\n{body}",
        body.len()
    )
}

fn response_error_detail(text: &str) -> String {
    serde_json::from_str::<Value>(text)
        .ok()
        .and_then(|value| {
            value
                .get("error")
                .and_then(Value::as_str)
                .map(String::from)
        })
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| text.trim().to_string())
}

fn http_status_error(prefix: &str, status: reqwest::StatusCode, text: &str) -> String {
    let detail = response_error_detail(text);
    if detail.is_empty() {
        format!("{prefix} returned HTTP {status}")
    } else {
        format!("{prefix} returned HTTP {status}: {detail}")
    }
}

fn http_empty_response(status: &str) -> String {
    format!(
        "HTTP/1.1 {status}\r\ncontent-length: 0\r\naccess-control-allow-origin: *\r\naccess-control-allow-methods: GET,POST,OPTIONS\r\naccess-control-allow-headers: content-type\r\naccess-control-allow-private-network: true\r\nconnection: close\r\n\r\n"
    )
}

fn read_http_request(mut stream: &mut TcpStream) -> Result<(String, String, String), String> {
    let mut buffer = Vec::new();
    let mut temp = [0_u8; 1024];

    loop {
        let bytes_read = stream.read(&mut temp).map_err(|error| error.to_string())?;
        if bytes_read == 0 {
            break;
        }

        buffer.extend_from_slice(&temp[..bytes_read]);

        let Some(header_end) = buffer.windows(4).position(|window| window == b"\r\n\r\n") else {
            if buffer.len() > 65536 {
                return Err("Request headers are too large.".to_string());
            }
            continue;
        };

        let header_end = header_end + 4;
        let headers = String::from_utf8_lossy(&buffer[..header_end]).into_owned();
        let content_length = headers
            .lines()
            .find_map(|line| {
                let lower = line.to_ascii_lowercase();
                lower
                    .strip_prefix("content-length:")
                    .and_then(|value| value.trim().parse::<usize>().ok())
            })
            .unwrap_or(0);

        while buffer.len() < header_end + content_length {
            let bytes_read = stream.read(&mut temp).map_err(|error| error.to_string())?;
            if bytes_read == 0 {
                break;
            }
            buffer.extend_from_slice(&temp[..bytes_read]);
        }

        let request_line = headers.lines().next().unwrap_or_default();
        let mut parts = request_line.split_whitespace();
        let method = parts.next().unwrap_or_default().to_string();
        let path = parts.next().unwrap_or("/").to_string();
        let body = String::from_utf8_lossy(&buffer[header_end..header_end + content_length]).to_string();
        return Ok((method, path, body));
    }

    Err("Empty HTTP request.".to_string())
}

fn handle_desktop_bridge_connection(mut stream: TcpStream, app: AppHandle) {
    let response = match read_http_request(&mut stream) {
        Ok((method, path, body)) => match (method.as_str(), path.as_str()) {
            ("OPTIONS", _) => http_empty_response("204 No Content"),
            ("GET", "/health") => http_json_response(
                "200 OK",
                json!({
                    "ok": true,
                    "service": "miva-desktop",
                    "port": 43111,
                    "app": "MiVA Desktop",
                    "capabilities": ["ollama-status", "hardware-info", "profile-migration", "model-delete"],
                    "note": "Desktop bridge for web console local checks and profile migration."
                }),
            ),
            ("GET", "/ollama/status") => http_json_response("200 OK", json!(get_ollama_status_inner())),
            ("GET", "/hardware") => http_json_response("200 OK", json!(get_hardware_info_inner())),
            ("POST", "/profiles/migrate-deleted-model") => {
                let payload = serde_json::from_str::<Value>(&body).unwrap_or_else(|_| json!({}));
                let deleted_model = payload
                    .get("model")
                    .and_then(Value::as_str)
                    .unwrap_or_default()
                    .trim();

                if deleted_model.is_empty() {
                    http_json_response(
                        "400 Bad Request",
                        json!({
                            "error": "MODEL_REQUIRED",
                            "message": "Request body must include a model name."
                        }),
                    )
                } else {
                    match migrate_profiles_from_deleted_model_inner(app, deleted_model) {
                        Ok(result) => http_json_response("200 OK", result),
                        Err(error) => http_json_response(
                            "500 Internal Server Error",
                            json!({
                                "error": "PROFILE_MIGRATION_FAILED",
                                "message": error
                            }),
                        ),
                    }
                }
            }
            ("POST", "/models/delete") => {
                let payload = serde_json::from_str::<Value>(&body).unwrap_or_else(|_| json!({}));
                let model = payload
                    .get("model")
                    .and_then(Value::as_str)
                    .unwrap_or_default()
                    .trim();

                if model.is_empty() {
                    http_json_response(
                        "400 Bad Request",
                        json!({
                            "error": "MODEL_REQUIRED",
                            "message": "Request body must include a model name."
                        }),
                    )
                } else if !is_allowed_model(model) {
                    http_json_response(
                        "400 Bad Request",
                        json!({
                            "error": "MODEL_NOT_ALLOWED",
                            "allowedModels": ALLOWED_MODELS
                        }),
                    )
                } else {
                    match delete_ollama_model_inner(model) {
                        Ok(result) => http_json_response("200 OK", result),
                        Err(error) => http_json_response(
                            "502 Bad Gateway",
                            json!({
                                "ok": false,
                                "model": model,
                                "error": error
                            }),
                        ),
                    }
                }
            }
            _ => http_json_response(
                "404 Not Found",
                json!({
                    "error": "NOT_FOUND",
                    "path": path
                }),
            ),
        },
        Err(error) => http_json_response(
            "400 Bad Request",
            json!({
                "error": "INVALID_REQUEST",
                "message": error
            }),
        ),
    };

    let _ = stream.write_all(response.as_bytes());
    let _ = stream.flush();
}

fn start_desktop_bridge(app: AppHandle) {
    thread::spawn(move || {
        let listener = match TcpListener::bind(DESKTOP_BRIDGE_ADDR) {
            Ok(listener) => listener,
            Err(error) => {
                eprintln!("MiVA desktop bridge unavailable on {DESKTOP_BRIDGE_ADDR}: {error}");
                return;
            }
        };

        for stream in listener.incoming() {
            match stream {
                Ok(stream) => {
                    let app = app.clone();
                    thread::spawn(move || handle_desktop_bridge_connection(stream, app));
                }
                Err(error) => eprintln!("MiVA desktop bridge connection failed: {error}"),
            }
        }
    });
}

#[tauri::command]
async fn get_ollama_status() -> Result<OllamaStatus, String> {
    tauri::async_runtime::spawn_blocking(get_ollama_status_inner)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn install_ollama() -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(install_ollama_inner)
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn start_ollama() -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(start_ollama_inner)
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn pull_model(app: AppHandle, model: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || pull_model_inner(app, model))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn pause_model_pull(model: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || pause_model_pull_inner(&model))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn cancel_model_pull(model: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || cancel_model_pull_inner(&model))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn delete_model(model: String) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || delete_ollama_model_inner(&model))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn chat_once(
    provider: String,
    model: String,
    prompt: String,
    locale: String,
    api_key: Option<String>,
    auth_token: Option<String>,
    profile: Option<Value>,
    messages: Option<Value>,
    memory_summary: Option<String>,
    tool_context: Option<String>,
    image_attachments: Option<Value>,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        chat_once_inner(
            provider,
            model,
            prompt,
            locale,
            api_key,
            auth_token,
            profile,
            messages,
            memory_summary,
            tool_context,
            image_attachments,
        )
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn read_image_attachment(path: String) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || read_image_attachment_inner(path))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn analyze_document(path: String) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || analyze_document_inner(path))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn request_local_helper(
    method: String,
    path: String,
    body: Option<Value>,
) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || {
        request_local_helper_json(
            method.trim(),
            path.trim(),
            body.filter(|value| !value.is_null()),
        )
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn get_claw_code_status() -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(get_claw_code_status_inner)
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn install_claw_code(workspace_root: Option<String>) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || install_claw_code_inner(workspace_root))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn set_claw_code_workspace(workspace_root: String) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || set_claw_code_workspace_inner(workspace_root))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn get_hardware_info() -> Result<HardwareInfo, String> {
    tauri::async_runtime::spawn_blocking(get_hardware_info_inner)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn get_runtime_requirements() -> Result<RuntimeRequirements, String> {
    tauri::async_runtime::spawn_blocking(get_runtime_requirements_inner)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn get_default_python_install_dir() -> Result<String, String> {
    Ok(default_python_install_dir_inner())
}

#[tauri::command]
async fn install_python(target_dir: Option<String>) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || install_python_inner(target_dir))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn install_live2d_runtime(app: AppHandle) -> Result<Live2DInstallResult, String> {
    tauri::async_runtime::spawn_blocking(move || install_live2d_runtime_inner(app))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn get_live2d_runtime_status(app: AppHandle) -> Result<Live2DInstallResult, String> {
    tauri::async_runtime::spawn_blocking(move || live2d_runtime_status_inner(app))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn load_assistant_profile_store(app: AppHandle) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || load_assistant_profile_store_inner(app))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn save_assistant_profile_store(app: AppHandle, store: Value) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || save_assistant_profile_store_inner(app, store))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn load_app_preferences(app: AppHandle) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || load_app_preferences_inner(app))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn save_app_preferences(app: AppHandle, preferences: Value) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || save_app_preferences_inner(app, preferences))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn load_library_items_store(app: AppHandle) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || load_library_items_store_inner(app))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn save_library_items_store(app: AppHandle, store: Value) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || save_library_items_store_inner(app, store))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn load_chat_history_store(app: AppHandle) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || load_chat_history_store_inner(app))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn save_chat_history_store(app: AppHandle, store: Value) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || save_chat_history_store_inner(app, store))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn delete_runtime_chat_messages(
    app: AppHandle,
    assistant_id: String,
) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || {
        delete_runtime_chat_messages_inner(app, assistant_id)
    })
    .await
    .map_err(|error| error.to_string())?
}

fn focus_main_window(app: &AppHandle) {
    if let Some(main) = app.get_webview_window("main") {
        let _ = main.set_focus();
    }
}

fn nudge_overlay_transparency(overlay: &WebviewWindow) -> Result<(), String> {
    let size = overlay.inner_size().map_err(|error| error.to_string())?;
    let nudged = PhysicalSize::new(size.width.saturating_add(1), size.height);
    overlay
        .set_size(nudged)
        .map_err(|error| error.to_string())?;
    overlay.set_size(size).map_err(|error| error.to_string())?;
    Ok(())
}

fn position_character_overlay_beside_main(
    app: &AppHandle,
    overlay: &WebviewWindow,
) -> Result<(), String> {
    let main = app
        .get_webview_window("main")
        .ok_or_else(|| "Main window not found.".to_string())?;
    let main_pos = main.outer_position().map_err(|error| error.to_string())?;
    let main_size = main.outer_size().map_err(|error| error.to_string())?;
    let overlay_size = overlay.outer_size().map_err(|error| error.to_string())?;
    let gap = 16_i32;
    let monitor = overlay
        .current_monitor()
        .ok()
        .flatten()
        .or_else(|| main.current_monitor().ok().flatten());

    let mut x = main_pos.x + main_size.width as i32 + gap;
    let mut y = main_pos.y;

    if let Some(monitor) = monitor {
        let monitor_pos = monitor.position();
        let monitor_size = monitor.size();
        let monitor_right = monitor_pos.x + monitor_size.width as i32;
        let monitor_bottom = monitor_pos.y + monitor_size.height as i32;
        let overlay_width = overlay_size.width as i32;
        let overlay_height = overlay_size.height as i32;

        if x + overlay_width > monitor_right {
            x = main_pos.x - overlay_width - gap;
        }

        if x < monitor_pos.x {
            x = monitor_pos.x + ((monitor_size.width as i32 - overlay_width) / 2).max(gap);
        }

        if y + overlay_height > monitor_bottom {
            y = (monitor_bottom - overlay_height).max(monitor_pos.y);
        }

        if y < monitor_pos.y {
            y = monitor_pos.y;
        }
    }

    overlay
        .set_position(PhysicalPosition::new(x, y))
        .map_err(|error| error.to_string())?;

    Ok(())
}

fn build_character_overlay_window(app: &AppHandle) -> Result<WebviewWindow, String> {
    WebviewWindowBuilder::new(
        app,
        CHARACTER_OVERLAY_LABEL,
        WebviewUrl::App("index.html?overlay=character".into()),
    )
    .title("MiVA Character")
    .inner_size(380.0, 540.0)
    .min_inner_size(280.0, 360.0)
    .resizable(true)
    .decorations(false)
    .transparent(true)
    .shadow(false)
    .focused(false)
    .focusable(true)
    .always_on_top(true)
    .skip_taskbar(false)
    .build()
    .map_err(|error| error.to_string())
}

#[tauri::command]
async fn show_character_overlay(app: AppHandle) -> Result<Value, String> {
    if let Some(window) = app.get_webview_window(CHARACTER_OVERLAY_LABEL) {
        position_character_overlay_beside_main(&app, &window)?;
        window.show().map_err(|error| error.to_string())?;
        let _ = nudge_overlay_transparency(&window);
        focus_main_window(&app);
        return Ok(json!({
            "open": true,
            "created": false
        }));
    }

    let app_handle = app.clone();
    let overlay = tauri::async_runtime::spawn_blocking(move || build_character_overlay_window(&app_handle))
        .await
        .map_err(|error| error.to_string())??;

    position_character_overlay_beside_main(&app, &overlay)?;
    overlay.show().map_err(|error| error.to_string())?;
    let _ = nudge_overlay_transparency(&overlay);
    focus_main_window(&app);

    Ok(json!({
        "open": true,
        "created": true
    }))
}

#[tauri::command]
fn close_character_overlay(app: AppHandle) -> Result<Value, String> {
    if let Some(window) = app.get_webview_window(CHARACTER_OVERLAY_LABEL) {
        window.close().map_err(|error| error.to_string())?;
    }

    Ok(json!({
        "open": false
    }))
}

#[tauri::command]
fn is_character_overlay_open(app: AppHandle) -> Result<bool, String> {
    Ok(app.get_webview_window(CHARACTER_OVERLAY_LABEL).is_some())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            start_desktop_bridge(app.handle().clone());
            app.manage(LocalHelperProcess(Mutex::new(start_local_helper_process(app.handle()))));
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                if window.label() == "main" {
                    if let Some(overlay) = window.app_handle().get_webview_window(CHARACTER_OVERLAY_LABEL) {
                        let _ = overlay.close();
                    }

                    if let Some(state) = window.app_handle().try_state::<LocalHelperProcess>() {
                        if let Ok(mut child) = state.0.lock() {
                            if let Some(process) = child.as_mut() {
                                let _ = process.kill();
                            }
                            *child = None;
                        }
                    }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_ollama_status,
            install_ollama,
            start_ollama,
            pull_model,
            pause_model_pull,
            cancel_model_pull,
            delete_model,
            chat_once,
            read_image_attachment,
            analyze_document,
            request_local_helper,
            get_claw_code_status,
            install_claw_code,
            set_claw_code_workspace,
            get_hardware_info,
            get_runtime_requirements,
            get_default_python_install_dir,
            install_python,
            install_live2d_runtime,
            get_live2d_runtime_status,
            load_assistant_profile_store,
            save_assistant_profile_store,
            load_app_preferences,
            save_app_preferences,
            load_library_items_store,
            save_library_items_store,
            load_chat_history_store,
            save_chat_history_store,
            delete_runtime_chat_messages,
            show_character_overlay,
            close_character_overlay,
            is_character_overlay_open
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
