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
 * @version 2.1.2
 * @copyright (c) 2026 Gobinda Nandi
 */

import * as vscode from "vscode";
import * as fs from "fs";
import type { ShellId, BoltScript } from "./types";
import { getWorkspaceRoot, getScriptsForScope, getScripts, getConfigTarget } from "./config";
import { resolveScriptForRun } from "./resolve";
import { runScriptInTerminal } from "./terminal";
import { pickScriptPath } from "./pickScriptPath";

/**
 * Activates the extension: creates the status bar item and registers the run-scripts command.
 */
export function activate(context: vscode.ExtensionContext): void {
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.text = "$(zap) BoltS";
  statusBarItem.tooltip = "BoltS: Run, add, or manage scripts";
  statusBarItem.command = "bolts.openMenu";
  statusBarItem.show();

  /**
   * Main BoltS menu entrypoint. Shows a small Quick Pick with "Run script",
   * "Add script", and "Manage scripts", then delegates to the chosen command.
   *
   * @since 2.1.2 [02-03-2026]
   * @version 2.1.2
   */
  const openMenuCommand = vscode.commands.registerCommand("bolts.openMenu", async () => {
    const scripts = getScripts();
    const items: vscode.QuickPickItem[] = [];
    if (scripts.length > 0) {
      items.push({ label: "$(play) Run script", description: "Run a script from the menu" });
    }
    items.push(
      { label: "$(add) Add script", description: "Add a new script (global or project)" },
      { label: "$(settings-gear) Manage scripts", description: "Edit or delete scripts" }
    );
    const chosen = await vscode.window.showQuickPick(items, {
      title: "BoltS",
      placeHolder: scripts.length === 0 ? "No scripts yet — add or manage" : "Run, add, or manage scripts",
    });
    if (!chosen) {
      return;
    }
    if (chosen.label.includes("Run script")) {
      await vscode.commands.executeCommand("bolts.runScripts");
    } else if (chosen.label.includes("Add script")) {
      await vscode.commands.executeCommand("bolts.addScript");
    } else if (chosen.label.includes("Manage scripts")) {
      await vscode.commands.executeCommand("bolts.manageScripts");
    }
  });

  /**
   * Interactive flow for adding a new script:
   * 1) Ask for an alias, 2) let the user pick a path (or enter one),
   * 3) optionally collect args and shell, 4) choose user/workspace scope,
   * 5) append to the appropriate bolts.scripts array.
   *
   * @since 2.1.2 [02-03-2026]
   * @version 2.1.2
   */
  const addScriptCommand = vscode.commands.registerCommand("bolts.addScript", async () => {
    const alias = await vscode.window.showInputBox({
      title: "BoltS: Add script",
      prompt: "Display name shown in the menu (e.g. Deploy, Reset DB)",
      placeHolder: "My script",
      validateInput: (v) => (!v?.trim() ? "Enter a name" : undefined),
    });
    if (alias === undefined || !alias.trim()) {
      return;
    }
    const scriptPath = await pickScriptPath();
    if (!scriptPath) {
      return;
    }
    const scriptArgs = await vscode.window.showInputBox({
      title: "BoltS: Add script",
      prompt: "Arguments (optional). e.g. --ABCD 1 or --env prod",
      placeHolder: "Leave empty for no arguments",
    });
    if (scriptArgs === undefined) {
      return;
    }
    const shellPick = await vscode.window.showQuickPick(
      [
        { label: "Use default (OS)", description: "PowerShell on Windows, bash on Linux/macOS", shell: "os" as ShellId },
        { label: "PowerShell", shell: "powershell" as ShellId },
        { label: "CMD", shell: "cmd" as ShellId },
        { label: "Bash", shell: "bash" as ShellId },
        { label: "Git Bash", shell: "gitbash" as ShellId },
        { label: "WSL", shell: "wsl" as ShellId },
        { label: "sh", shell: "sh" as ShellId },
      ],
      { title: "BoltS: Shell (optional)", placeHolder: "Which terminal/shell to run in" }
    );
    if (shellPick === undefined) {
      return;
    }
    const target = await vscode.window.showQuickPick(
      [
        { label: "User (global)", description: "Save to user settings — applies to all workspaces", target: "user" as const },
        { label: "Workspace (project)", description: "Save to this project's .vscode/settings.json", target: "workspace" as const },
      ],
      {
        title: "BoltS: Where to save",
        placeHolder: "Choose where to add this script",
      }
    );
    if (!target) {
      return;
    }
    const config = vscode.workspace.getConfiguration("bolts");
    const configTarget = getConfigTarget(target.target);
    const current = getScriptsForScope(config, target.target);
    const newScript: BoltScript = {
      alias: alias.trim(),
      path: scriptPath.trim(),
      ...(scriptArgs?.trim() && { args: scriptArgs.trim() }),
      ...(shellPick.shell !== "os" && { shell: shellPick.shell }),
    };
    const updated = [...current, newScript];
    await config.update("scripts", updated, configTarget);
    vscode.window.showInformationMessage(`BoltS: Added "${newScript.alias}" to ${target.target} settings.`);
  });

  /**
   * "Manage scripts" flow for editing or deleting configured scripts in either
   * user or workspace scope. Lets the user pick a script, then choose Edit/Delete.
   *
   * @since 2.1.2 [02-03-2026]
   * @version 2.1.2
   */
  const manageScriptsCommand = vscode.commands.registerCommand("bolts.manageScripts", async () => {
    const config = vscode.workspace.getConfiguration("bolts");
    const target = await vscode.window.showQuickPick(
      [
        { label: "User (global)", description: "Edit or delete scripts in user settings", scope: "user" as const },
        { label: "Workspace (project)", description: "Edit or delete scripts in this project", scope: "workspace" as const },
      ],
      { title: "BoltS: Manage scripts in", placeHolder: "Choose which settings to manage" }
    );
    if (!target) {
      return;
    }
    const scripts = getScriptsForScope(config, target.scope);
    if (scripts.length === 0) {
      vscode.window.showInformationMessage(`BoltS: No scripts in ${target.scope} settings. Add some first.`);
      return;
    }
    const chosen = await vscode.window.showQuickPick(
      scripts.map((s, i) => ({
        label: s.alias,
        description: s.args ? `${s.path} ${s.args}` : s.path,
        script: s,
        index: i,
      })),
      { title: "BoltS: Select script to manage", placeHolder: "Pick a script" }
    );
    if (!chosen) {
      return;
    }
    const action = await vscode.window.showQuickPick(
      [
        { label: "Edit", description: "Change alias or path", action: "edit" as const },
        { label: "Delete", description: "Remove this script", action: "delete" as const },
      ],
      { title: "BoltS: Edit or delete?", placeHolder: "Choose action" }
    );
    if (!action) {
      return;
    }
    if (action.action === "delete") {
      const updated = scripts.filter((_, i) => i !== chosen.index);
      await config.update("scripts", updated, getConfigTarget(target.scope));
      vscode.window.showInformationMessage(`BoltS: Removed "${chosen.script.alias}" from ${target.scope} settings.`);
      return;
    }
    const newAlias = await vscode.window.showInputBox({
      title: "BoltS: Edit script",
      prompt: "Display name",
      value: chosen.script.alias,
      validateInput: (v) => (!v?.trim() ? "Enter a name" : undefined),
    });
    if (newAlias === undefined) {
      return;
    }
    const newPath = await vscode.window.showInputBox({
      title: "BoltS: Edit script",
      prompt: "Path to script",
      value: chosen.script.path,
      validateInput: (v) => (!v?.trim() ? "Enter a path" : undefined),
    });
    if (newPath === undefined) {
      return;
    }
    const newArgs = await vscode.window.showInputBox({
      title: "BoltS: Edit script",
      prompt: "Arguments (optional). e.g. --ABCD 1",
      value: chosen.script.args ?? "",
      placeHolder: "Leave empty for no arguments",
    });
    if (newArgs === undefined) {
      return;
    }
    const shellPick = await vscode.window.showQuickPick(
      [
        { label: "Use default (OS)", shell: "os" as ShellId },
        { label: "PowerShell", shell: "powershell" as ShellId },
        { label: "CMD", shell: "cmd" as ShellId },
        { label: "Bash", shell: "bash" as ShellId },
        { label: "Git Bash", shell: "gitbash" as ShellId },
        { label: "WSL", shell: "wsl" as ShellId },
        { label: "sh", shell: "sh" as ShellId },
      ],
      { title: "BoltS: Shell", placeHolder: "Which terminal/shell to run in" }
    );
    if (shellPick === undefined) {
      return;
    }
    const updated = scripts.slice();
    const edited: BoltScript = {
      ...chosen.script,
      alias: newAlias.trim(),
      path: newPath.trim(),
      ...(newArgs?.trim() ? { args: newArgs.trim() } : { args: undefined }),
      ...(shellPick.shell !== "os" ? { shell: shellPick.shell } : { shell: undefined }),
    };
    updated[chosen.index] = edited;
    await config.update("scripts", updated, getConfigTarget(target.scope));
    vscode.window.showInformationMessage(`BoltS: Updated "${chosen.script.alias}" in ${target.scope} settings.`);
  });

  /**
   * Runs a configured script:
   * - Shows a list of aliases to choose from.
   * - Resolves configuration, path, and shell for the current OS.
   * - Verifies the script exists and launches it in a BoltS terminal.
   *
   * @since 2.1.2 [02-03-2026]
   * @version 2.1.2
   */
  const runScriptsCommand = vscode.commands.registerCommand("bolts.runScripts", async () => {
    const scripts = getScripts();
    if (scripts.length === 0) {
      vscode.window.showInformationMessage(
        "BoltS: No scripts configured. Add entries to the \"bolts.scripts\" setting."
      );
      return;
    }

    const chosen = await vscode.window.showQuickPick(
      scripts.map((s) => ({
        label: s.alias,
        description: s.args ? `${s.path} ${s.args}` : s.path,
        script: s,
      })),
      {
        placeHolder: "Select a script to run",
        matchOnDescription: false,
      }
    );

    if (!chosen) {
      return;
    }

    const workspaceRoot = getWorkspaceRoot();
    const config = vscode.workspace.getConfiguration("bolts");
    const defaultShell = (config.get<ShellId>("defaultShell") ?? "os") as ShellId;
    const resolved = resolveScriptForRun(chosen.script, workspaceRoot, defaultShell);

    if (!fs.existsSync(resolved.resolvedPath)) {
      vscode.window.showErrorMessage(`BoltS: Script not found: ${resolved.resolvedPath}`);
      return;
    }

    const wslDistro = config.get<string>("wslDistro");
    runScriptInTerminal(resolved.resolvedPath, resolved.args, resolved.shell, wslDistro);
  });

  context.subscriptions.push(statusBarItem, openMenuCommand, addScriptCommand, manageScriptsCommand, runScriptsCommand);
}

/**
 * Deactivate hook. No cleanup required; subscriptions are disposed by the host.
 */
export function deactivate(): void {}
