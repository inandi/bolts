import * as vscode from "vscode";
import type { BoltScript, ConfigScope } from "./types";

/**
 * Returns the first workspace folder path, or undefined if no folder is open.
 *
 * @since 2.1.2 [02-03-2026]
 * @version 2.1.2
 */
export function getWorkspaceRoot(): string | undefined {
  const folder = vscode.workspace.workspaceFolders?.[0];
  return folder?.uri.fsPath;
}

/**
 * Returns the scripts array for the given scope (from config.inspect).
 *
 * @since 2.1.2 [02-03-2026]
 * @version 2.1.2
 */
export function getScriptsForScope(config: vscode.WorkspaceConfiguration, scope: ConfigScope): BoltScript[] {
  if (scope === "effective") {
    const scripts = config.get<BoltScript[]>("scripts") ?? [];
    return scripts.filter((s) => typeof s?.alias === "string" && typeof s?.path === "string");
  }

  const inspected = config.inspect<BoltScript[]>("scripts");
  if (!inspected) {
    return [];
  }

  let raw: BoltScript[] | undefined;
  if (scope === "user") {
    raw = inspected.globalValue;
  } else {
    raw = inspected.workspaceFolderValue ?? inspected.workspaceValue;
  }

  const scripts = raw ?? [];
  return scripts.filter((s) => typeof s?.alias === "string" && typeof s?.path === "string");
}

/**
 * Reads and validates bolts.scripts using the configured scope (global / project / effective).
 *
 * @since 2.1.2 [02-03-2026]
 * @version 2.1.2
 */
export function getScripts(): BoltScript[] {
  const config = vscode.workspace.getConfiguration("bolts");
  const scope = (config.get<ConfigScope>("configScope") ?? "effective") as ConfigScope;
  return getScriptsForScope(config, scope);
}

/**
 * Returns the ConfigurationTarget for the given scope (for config.update).
 *
 * @since 2.1.2 [02-03-2026]
 * @version 2.1.2
 */
export function getConfigTarget(scope: "user" | "workspace"): vscode.ConfigurationTarget {
  return scope === "user" ? vscode.ConfigurationTarget.Global : vscode.ConfigurationTarget.Workspace;
}

