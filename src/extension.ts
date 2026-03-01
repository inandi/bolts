/**
 * BoltS Extension Main Module
 *
 * VS Code extension for launching shell scripts from the status bar. Provides a
 * Script Menu (Quick Pick) with configurable aliases and paths. Resolves paths
 * relative to workspace (./), home (~), or absolute, and runs scripts in the
 * integrated terminal.
 *
 * @author Gobinda Nandi <gobinda.nandi.public@gmail.com>
 * @since 1.1.2 [01-03-2026]
 * @version 1.1.1
 * @copyright (c) 2026 Gobinda Nandi
 */

import * as vscode from "vscode";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";

/** Script entry from bolts.scripts setting (alias + path). */
interface BoltScript {
  alias: string;
  path: string;
}

/**
 * Resolves a script path from user settings to an absolute filesystem path.
 * - Paths starting with ./ are relative to the workspace root.
 * - Paths starting with ~ are relative to the user's home directory (Mac/Linux/Windows).
 * - Paths starting with / (Unix) or a drive letter (Windows) are used as absolute.
 */
function resolveScriptPath(rawPath: string, workspaceRoot: string | undefined): string {
  const trimmed = rawPath.trim();

  if (trimmed.startsWith("~/") || trimmed === "~") {
    const rest = trimmed === "~" ? "" : trimmed.slice(2);
    return path.join(os.homedir(), rest);
  }

  if (trimmed.startsWith("./") || trimmed.startsWith(".\\")) {
    const rest = trimmed.slice(2);
    const root = workspaceRoot ?? os.homedir();
    return path.resolve(root, rest);
  }

  if (path.isAbsolute(trimmed)) {
    return trimmed;
  }

  const root = workspaceRoot ?? os.homedir();
  return path.resolve(root, trimmed);
}

/**
 * Returns the first workspace folder path, or undefined if no folder is open.
 */
function getWorkspaceRoot(): string | undefined {
  const folder = vscode.workspace.workspaceFolders?.[0];
  return folder?.uri.fsPath;
}

/**
 * Reads and validates bolts.scripts from workspace configuration.
 */
function getScripts(): BoltScript[] {
  const config = vscode.workspace.getConfiguration("bolts");
  const scripts = config.get<BoltScript[]>("scripts") ?? [];
  return scripts.filter((s) => typeof s?.alias === "string" && typeof s?.path === "string");
}

/**
 * Creates an integrated terminal, sets cwd to the script directory, and runs the script.
 * Uses bash on non-Windows; runs the path directly on Windows.
 */
function runScriptInTerminal(resolvedPath: string): void {
  const scriptDir = path.dirname(resolvedPath);
  const quotedPath = resolvedPath.includes(" ") ? `"${resolvedPath}"` : resolvedPath;

  const isWindows = process.platform === "win32";
  const runCommand = isWindows ? quotedPath : `bash ${quotedPath}`;

  const terminal = vscode.window.createTerminal({
    cwd: scriptDir,
    name: "BoltS",
  });
  terminal.show();
  terminal.sendText(runCommand);
}

/**
 * Activates the extension: creates the status bar item and registers the run-scripts command.
 */
export function activate(context: vscode.ExtensionContext): void {
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.text = "$(zap) BoltS";
  statusBarItem.tooltip = "Run a script from the BoltS menu";
  statusBarItem.command = "bolts.runScripts";
  statusBarItem.show();

  const runScriptsCommand = vscode.commands.registerCommand("bolts.runScripts", async () => {
    const scripts = getScripts();
    if (scripts.length === 0) {
      vscode.window.showInformationMessage(
        "BoltS: No scripts configured. Add entries to the \"bolts.scripts\" setting."
      );
      return;
    }

    const chosen = await vscode.window.showQuickPick(
      scripts.map((s) => ({ label: s.alias, script: s })),
      {
        placeHolder: "Select a script to run",
        matchOnDescription: false,
      }
    );

    if (!chosen) {
      return;
    }

    const workspaceRoot = getWorkspaceRoot();
    const resolvedPath = resolveScriptPath(chosen.script.path, workspaceRoot);

    if (!fs.existsSync(resolvedPath)) {
      vscode.window.showErrorMessage(`BoltS: Script not found: ${resolvedPath}`);
      return;
    }

    runScriptInTerminal(resolvedPath);
  });

  context.subscriptions.push(statusBarItem, runScriptsCommand);
}

/**
 * Deactivate hook. No cleanup required; subscriptions are disposed by the host.
 */
export function deactivate(): void {}
