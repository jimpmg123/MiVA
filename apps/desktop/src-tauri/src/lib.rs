use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::env;
use std::fs;
use std::io::{BufRead, BufReader, Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::thread;
use std::time::Duration;
use sysinfo::{Disks, System};
use tauri::{AppHandle, Emitter, Manager};

const OLLAMA_BASE_URL: &str = "http://localhost:11434";
const LOCAL_HELPER_URL: &str = "http://127.0.0.1:43110";
const DESKTOP_BRIDGE_ADDR: &str = "127.0.0.1:43111";
const ALLOWED_MODELS: [&str; 6] = [
    "qwen3:4b",
    "exaone3.5:2.4b",
    "exaone3.5:7.8b",
    "llama3.2:3b",
    "gemma3:4b",
    "phi3:mini",
];
const ASSISTANT_PROFILE_STORE_FILE: &str = "assistant-profiles.json";

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
    error: Option<String>,
}

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

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceCliToolStatus {
    installed: bool,
    command: Option<String>,
    version: Option<String>,
    error: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceAuthStatus {
    gcloud_account: Option<String>,
    gws_authenticated: bool,
    gws_status: Option<String>,
    error: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceCliStatus {
    npm: WorkspaceCliToolStatus,
    gcloud: WorkspaceCliToolStatus,
    gws: WorkspaceCliToolStatus,
    auth: WorkspaceAuthStatus,
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
        match Command::new(&candidate).arg("--version").output() {
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

fn run_command_to_string(mut command: Command) -> Result<String, String> {
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
    let output = Command::new(program).args(args).output().ok()?;
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

fn detect_python_requirement() -> RuntimeRequirement {
    let candidates: [(&str, &[&str]); 3] = [
        ("python", &["--version"]),
        ("python3", &["--version"]),
        ("py", &["-3", "--version"]),
    ];

    for (program, args) in candidates {
        if let Some(version) = command_version(program, args) {
            let parsed = parse_python_version(&version);
            let meets_minimum =
                parsed.is_some_and(|(major, minor, _)| major > 3 || (major == 3 && minor >= 8));
            let command = if args.is_empty() {
                program.to_string()
            } else {
                format!("{program} {}", args.join(" "))
            };

            return RuntimeRequirement {
                id: "python".to_string(),
                label: "Python 3.8+".to_string(),
                required_for:
                    "Optional developer tools, local TTS/STT helpers, and future model utilities."
                        .to_string(),
                installed: true,
                meets_minimum,
                command: Some(command),
                version: Some(version),
                note: if meets_minimum {
                    "Detected. Ollama itself does not require Python.".to_string()
                } else {
                    "Detected, but some optional tools may require Python 3.8 or newer. Ollama itself does not require Python.".to_string()
                },
            };
        }
    }

    RuntimeRequirement {
        id: "python".to_string(),
        label: "Python 3.8+".to_string(),
        required_for:
            "Optional developer tools, local TTS/STT helpers, and future model utilities."
                .to_string(),
        installed: false,
        meets_minimum: false,
        command: None,
        version: None,
        note: "Not detected. Ollama can still install and run without Python.".to_string(),
    }
}

fn get_runtime_requirements_inner() -> RuntimeRequirements {
    RuntimeRequirements {
        python: detect_python_requirement(),
    }
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
        return Ok("Python 3.8+ is already installed.".to_string());
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

fn npm_candidates() -> Vec<String> {
    let mut candidates = vec!["npm".to_string(), "npm.cmd".to_string()];
    if let Ok(value) = env::var("APPDATA") {
        candidates.push(format!(r"{value}\npm\npm.cmd"));
    }
    candidates
}

fn gcloud_candidates() -> Vec<String> {
    let mut candidates = Vec::new();
    if let Ok(value) = env::var("GCLOUD_BIN") {
        candidates.push(value);
    }
    candidates.push("gcloud".to_string());
    candidates.push("gcloud.cmd".to_string());
    if let Ok(value) = env::var("LOCALAPPDATA") {
        candidates.push(format!(r"{value}\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"));
    }
    if let Ok(value) = env::var("PROGRAMFILES") {
        candidates.push(format!(r"{value}\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"));
    }
    candidates
}

fn gws_candidates() -> Vec<String> {
    let mut candidates = Vec::new();
    if let Ok(value) = env::var("GWS_BIN") {
        candidates.push(value);
    }
    candidates.push("gws".to_string());
    candidates.push("gws.cmd".to_string());
    if let Ok(value) = env::var("APPDATA") {
        candidates.push(format!(r"{value}\npm\gws.cmd"));
    }
    candidates
}

fn detect_cli_tool(candidates: Vec<String>, version_args: &[&str]) -> WorkspaceCliToolStatus {
    let mut last_error = None;

    for candidate in candidates {
        match Command::new(&candidate).args(version_args).output() {
            Ok(output) if output.status.success() => {
                let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
                let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
                let version = if stdout.is_empty() { stderr } else { stdout };
                return WorkspaceCliToolStatus {
                    installed: true,
                    command: Some(candidate),
                    version: if version.is_empty() { None } else { Some(version) },
                    error: None,
                };
            }
            Ok(output) => {
                let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
                last_error = Some(if stderr.is_empty() {
                    format!("{candidate} exited with {}", output.status)
                } else {
                    stderr
                });
            }
            Err(error) => {
                last_error = Some(error.to_string());
            }
        }
    }

    WorkspaceCliToolStatus {
        installed: false,
        command: None,
        version: None,
        error: last_error,
    }
}

fn detect_workspace_auth(gcloud: &WorkspaceCliToolStatus, gws: &WorkspaceCliToolStatus) -> WorkspaceAuthStatus {
    let gcloud_account = gcloud.command.as_ref().and_then(|command| {
        let output = Command::new(command)
            .args(["auth", "list", "--filter=status:ACTIVE", "--format=value(account)"])
            .output()
            .ok()?;
        if !output.status.success() {
            return None;
        }
        let account = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if account.is_empty() {
            None
        } else {
            Some(account)
        }
    });

    let (gws_authenticated, gws_status, error) = match &gws.command {
        Some(command) => match Command::new(command).args(["auth", "status"]).output() {
            Ok(output) => {
                let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
                let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
                let combined = [stdout, stderr]
                    .into_iter()
                    .filter(|part| !part.is_empty())
                    .collect::<Vec<_>>()
                    .join("\n");
                (output.status.success(), if combined.is_empty() { None } else { Some(combined) }, None)
            }
            Err(error) => (false, None, Some(error.to_string())),
        },
        None => (false, None, None),
    };

    WorkspaceAuthStatus {
        gcloud_account,
        gws_authenticated,
        gws_status,
        error,
    }
}

fn get_workspace_cli_status_inner() -> WorkspaceCliStatus {
    let npm = detect_cli_tool(npm_candidates(), &["--version"]);
    let gcloud = detect_cli_tool(gcloud_candidates(), &["--version"]);
    let gws = detect_cli_tool(gws_candidates(), &["--version"]);
    let auth = detect_workspace_auth(&gcloud, &gws);

    WorkspaceCliStatus {
        npm,
        gcloud,
        gws,
        auth,
    }
}

fn install_gcloud_cli_inner() -> Result<String, String> {
    let current = detect_cli_tool(gcloud_candidates(), &["--version"]);
    if current.installed {
        return Ok("Google Cloud CLI is already installed.".to_string());
    }

    Command::new("winget")
        .args([
            "install",
            "--id",
            "Google.CloudSDK",
            "--source",
            "winget",
            "--accept-package-agreements",
            "--accept-source-agreements",
        ])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|_| "Google Cloud CLI installer could not be started on this system. Try installing Google Cloud CLI manually from https://cloud.google.com/sdk/docs/install, then refresh status.".to_string())?;

    Ok("Google Cloud CLI installer started. Complete any installer prompts, then refresh status.".to_string())
}

fn install_gws_cli_inner() -> Result<String, String> {
    let current = detect_cli_tool(gws_candidates(), &["--version"]);
    if current.installed {
        return Ok("Google Workspace CLI is already installed.".to_string());
    }

    let npm = detect_cli_tool(npm_candidates(), &["--version"]);
    let npm_command = npm.command.ok_or_else(|| "npm is required to install @googleworkspace/cli.".to_string())?;

    let mut command = Command::new(npm_command);
    command.args(["install", "-g", "@googleworkspace/cli"]);
    run_command_to_string(command)
        .map(|_| "Google Workspace CLI installation finished. Refresh status before continuing.".to_string())
        .map_err(|_| "Google Workspace CLI installation failed. Check that Node.js/npm is available, then try again.".to_string())
}

fn start_gcloud_auth_inner() -> Result<String, String> {
    let status = detect_cli_tool(gcloud_candidates(), &["--version"]);
    let command = status.command.ok_or_else(|| "Google Cloud CLI is not installed.".to_string())?;

    Command::new(command)
        .args(["auth", "login", "--update-adc"])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|error| error.to_string())?;

    Ok("Google Cloud auth started. Complete the browser sign-in, then refresh status.".to_string())
}

fn normalize_workspace_services(services: Vec<String>) -> Vec<String> {
    let allowed = ["drive", "gmail", "calendar", "docs", "sheets"];
    let mut normalized = Vec::new();

    for service in services {
        let value = service.trim().to_ascii_lowercase();
        if allowed.contains(&value.as_str()) && !normalized.contains(&value) {
            normalized.push(value);
        }
    }

    normalized
}

fn start_gws_auth_inner(services: Vec<String>) -> Result<String, String> {
    let gws = detect_cli_tool(gws_candidates(), &["--version"]);
    let command = gws.command.ok_or_else(|| "Google Workspace CLI is not installed.".to_string())?;
    let selected_services = normalize_workspace_services(services);
    if selected_services.is_empty() {
        return Err("Select at least one Google Workspace product before starting auth.".to_string());
    }

    Command::new(command)
        .args(["auth", "login", "-s", &selected_services.join(",")])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|error| error.to_string())?;

    Ok(format!(
        "Google Workspace auth started for {}. Complete the browser consent, then refresh status.",
        selected_services.join(", ")
    ))
}

fn bytes_to_gb(bytes: u64) -> f64 {
    let gb = bytes as f64 / 1024.0 / 1024.0 / 1024.0;
    (gb * 10.0).round() / 10.0
}

fn detect_gpu_name() -> Option<String> {
    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-Command",
            "(Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name)",
        ])
        .output()
        .ok()?;

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
    Command::new(command)
        .arg("serve")
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|error| error.to_string())?;

    thread::sleep(Duration::from_millis(1500));

    if get_ollama_status_inner().running {
        Ok("Ollama started.".to_string())
    } else {
        Err("Ollama start was attempted, but the API is still unavailable.".to_string())
    }
}

fn emit_download_progress(
    app: &AppHandle,
    model: &str,
    status: impl Into<String>,
    completed: Option<u64>,
    total: Option<u64>,
    done: bool,
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
            error,
        },
    );
}

fn pull_model_inner(app: AppHandle, model: String) -> Result<String, String> {
    if !allowed_model(&model) {
        return Err(format!("{model} is not allowed in Phase 1."));
    }

    emit_download_progress(&app, &model, "Preparing download", None, None, false, None);

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
            emit_download_progress(
                &app,
                &model,
                "Download failed",
                None,
                None,
                true,
                Some(message.clone()),
            );
            message
        })?;

    if !response.status().is_success() {
        let message = format!("Ollama returned HTTP {}", response.status());
        emit_download_progress(
            &app,
            &model,
            "Download failed",
            None,
            None,
            true,
            Some(message.clone()),
        );
        return Err(message);
    }

    let reader = BufReader::new(response);
    let mut last_status = "Downloading".to_string();
    let mut layer_progress: HashMap<String, (u64, u64)> = HashMap::new();

    for line in reader.lines() {
        let line = line.map_err(|error| error.to_string())?;
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        let progress = serde_json::from_str::<PullStreamMessage>(trimmed)
            .map_err(|error| format!("Failed to parse Ollama progress: {error}"))?;

        if let Some(error) = progress.error {
            emit_download_progress(
                &app,
                &model,
                "Download failed",
                progress.completed,
                progress.total,
                true,
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

        let done = last_status.eq_ignore_ascii_case("success");
        emit_download_progress(
            &app,
            &model,
            last_status.clone(),
            completed,
            total,
            done,
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

    emit_download_progress(
        &app,
        &model,
        "Download complete",
        completed,
        total,
        true,
        None,
    );

    Ok(format!("{model} downloaded."))
}

fn chat_ollama_direct_inner(
    model: String,
    prompt: String,
    locale: String,
) -> Result<String, String> {
    if !allowed_model(&model) {
        return Err(format!("{model} is not allowed in Phase 1."));
    }

    let system_prompt = if locale == "ko" {
        "You are MiVA, the user's local personal AI assistant. Reply in natural Korean unless the user asks otherwise. Do not mix in unrelated languages. Keep answers short and practical."
    } else {
        "You are MiVA, the user's local personal AI assistant. Reply in English. Keep answers short and practical."
    };

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

    if !response.status().is_success() {
        return Err(format!("Ollama returned HTTP {}", response.status()));
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
    profile: Option<Value>,
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

    if let Some(profile) = profile {
        body["profile"] = profile;
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

fn chat_once_inner(
    provider: String,
    model: String,
    prompt: String,
    locale: String,
    api_key: Option<String>,
    profile: Option<Value>,
) -> Result<String, String> {
    let normalized_provider = if provider.trim().is_empty() {
        "ollama".to_string()
    } else {
        provider
    };

    match chat_via_local_helper(
        normalized_provider.clone(),
        model.clone(),
        prompt.clone(),
        locale.clone(),
        api_key,
        profile,
    ) {
        Ok(answer) => Ok(answer),
        Err(error) if normalized_provider == "ollama" => {
            eprintln!("Local helper chat failed, falling back to direct Ollama: {error}");
            chat_ollama_direct_inner(model, prompt, locale)
        }
        Err(error) => Err(error),
    }
}

fn http_json_response(status: &str, body: serde_json::Value) -> String {
    let body = serde_json::to_string_pretty(&body).unwrap_or_else(|_| "{}".to_string());
    format!(
        "HTTP/1.1 {status}\r\ncontent-type: application/json; charset=utf-8\r\ncontent-length: {}\r\naccess-control-allow-origin: *\r\naccess-control-allow-methods: GET,OPTIONS\r\naccess-control-allow-headers: content-type\r\nconnection: close\r\n\r\n{body}",
        body.len()
    )
}

fn http_empty_response(status: &str) -> String {
    format!(
        "HTTP/1.1 {status}\r\ncontent-length: 0\r\naccess-control-allow-origin: *\r\naccess-control-allow-methods: GET,OPTIONS\r\naccess-control-allow-headers: content-type\r\nconnection: close\r\n\r\n"
    )
}

fn handle_desktop_bridge_connection(mut stream: TcpStream) {
    let mut buffer = [0_u8; 2048];
    let bytes_read = match stream.read(&mut buffer) {
        Ok(bytes_read) => bytes_read,
        Err(_) => return,
    };

    let request = String::from_utf8_lossy(&buffer[..bytes_read]);
    let request_line = request.lines().next().unwrap_or_default();
    let mut parts = request_line.split_whitespace();
    let method = parts.next().unwrap_or_default();
    let path = parts.next().unwrap_or("/");

    let response = match (method, path) {
        ("OPTIONS", _) => http_empty_response("204 No Content"),
        ("GET", "/health") => http_json_response(
            "200 OK",
            json!({
                "ok": true,
                "service": "miva-desktop",
                "port": 43111,
                "app": "MiVA Desktop",
                "capabilities": ["ollama-status", "hardware-info"],
                "note": "Read-only desktop bridge for web console connection checks."
            }),
        ),
        ("GET", "/ollama/status") => http_json_response("200 OK", json!(get_ollama_status_inner())),
        ("GET", "/hardware") => http_json_response("200 OK", json!(get_hardware_info_inner())),
        _ => http_json_response(
            "404 Not Found",
            json!({
                "error": "NOT_FOUND",
                "path": path
            }),
        ),
    };

    let _ = stream.write_all(response.as_bytes());
    let _ = stream.flush();
}

fn start_desktop_bridge() {
    thread::spawn(|| {
        let listener = match TcpListener::bind(DESKTOP_BRIDGE_ADDR) {
            Ok(listener) => listener,
            Err(error) => {
                eprintln!("MiVA desktop bridge unavailable on {DESKTOP_BRIDGE_ADDR}: {error}");
                return;
            }
        };

        for stream in listener.incoming() {
            match stream {
                Ok(stream) => handle_desktop_bridge_connection(stream),
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
async fn chat_once(
    provider: String,
    model: String,
    prompt: String,
    locale: String,
    api_key: Option<String>,
    profile: Option<Value>,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        chat_once_inner(provider, model, prompt, locale, api_key, profile)
    })
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
async fn get_workspace_cli_status() -> Result<WorkspaceCliStatus, String> {
    tauri::async_runtime::spawn_blocking(get_workspace_cli_status_inner)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn install_gcloud_cli() -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(install_gcloud_cli_inner)
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn install_gws_cli() -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(install_gws_cli_inner)
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn start_gcloud_auth() -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(start_gcloud_auth_inner)
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn start_gws_auth(services: Vec<String>) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || start_gws_auth_inner(services))
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|_| {
            start_desktop_bridge();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_ollama_status,
            install_ollama,
            start_ollama,
            pull_model,
            chat_once,
            get_hardware_info,
            get_runtime_requirements,
            get_default_python_install_dir,
            install_python,
            get_workspace_cli_status,
            install_gcloud_cli,
            install_gws_cli,
            start_gcloud_auth,
            start_gws_auth,
            load_assistant_profile_store,
            save_assistant_profile_store
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
