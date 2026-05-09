import { invokeCommand } from "../../app/tauri";
import type { WorkspaceCliStatus, WorkspaceServiceId } from "../../types";

export function getWorkspaceCliStatus() {
  return invokeCommand<WorkspaceCliStatus>("get_workspace_cli_status");
}

export function installGcloudCli() {
  return invokeCommand<string>("install_gcloud_cli");
}

export function installGwsCli() {
  return invokeCommand<string>("install_gws_cli");
}

export function startGcloudAuth() {
  return invokeCommand<string>("start_gcloud_auth");
}

export function startGwsAuth(services: WorkspaceServiceId[]) {
  return invokeCommand<string>("start_gws_auth", { services });
}
