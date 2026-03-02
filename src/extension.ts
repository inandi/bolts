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
 * @version 2.1.1
 * @copyright (c) 2026 Gobinda Nandi
 */

import * as vscode from "vscode";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";

/** Shell identifier: which terminal/shell to run the script in. */
export type ShellId = "os" | "powershell" | "cmd" | "bash" | "gitbash" | "wsl" | "sh";

/** Platform-specific overrides (path, args, shell) for a script. */
interface BoltScriptPlatform {
  path?: string;
  args?: string;
  shell?: ShellId;
}

/** Script entry from bolts.scripts setting (alias, path, optional args, shell, OS overrides). */
interface BoltScript {
  alias: string;
  path: string;
  /** Optional arguments passed to the script (e.g. "--ABCD 1"). */
  args?: string;
  /** Which shell/terminal to run in. "os" = use default per OS. */
  shell?: ShellId;
  /** Overrides when running on Windows. */
  windows?: BoltScriptPlatform;
  /** Overrides when running on Linux. */
  linux?: BoltScriptPlatform;
  /** Overrides when running on macOS. */
  darwin?: BoltScriptPlatform;
}

/** Resolved script for the current OS: path, args, and shell to use. */
interface ResolvedScript {
  path: string;
  args: string | undefined;
  shell: ShellId;
}

/** Where to read scripts from: effective (default), user (global), or workspace (project). */
type ConfigScope = "effective" | "user" | "workspace";

/** Current OS key for platform overrides. */
const PLATFORM_KEY = process.platform === "win32" ? "windows" : process.platform === "darwin" ? "darwin" : "linux";

const IS_WINDOWS = process.platform === "win32";

/**
 * Converts a Windows path to a WSL path (e.g. C:\foo\bar -> /mnt/c/foo/bar).
 * Paths already starting with / (WSL-style) are returned as-is. Handles \\wsl$\...
 */
function windowsPathToWslPath(windowsPath: string): string {
  const normalized = path.normalize(windowsPath).replace(/\\/g, "/");
  if (normalized.startsWith("/")) {
    return normalized;
  }
  const wslPrefix = "/mnt/";
  const driveMatch = normalized.match(/^([A-Za-z]):\/(.*)$/);
  if (driveMatch) {
    const letter = driveMatch[1].toLowerCase();
    const rest = driveMatch[2] || "";
    return `${wslPrefix}${letter}/${rest}`;
  }
  if (normalized.match(/^\/\/wsl(\$|\.localhost)/i)) {
    const rest = normalized.replace(/^\/\/wsl\$\/[^/]+/i, "").replace(/^\/\/wsl\.localhost\/[^/]+/i, "").replace(/\\/g, "/");
    return rest.startsWith("/") ? rest : `/${rest}`;
  }
  return normalized.replace(/\\/g, "/");
}

/**
 * Resolves a script path from user settings to an absolute filesystem path.
 * - Paths starting with ./ are relative to the workspace root.
 * - Paths starting with ~ are relative to the user's home directory (Mac/Linux/Windows).
 * - Paths starting with / (Unix) or a drive letter (Windows) are used as absolute.
 * 
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
 * Returns the scripts array for the given scope (from config.inspect).
 */
function getScriptsForScope(config: vscode.WorkspaceConfiguration, scope: ConfigScope): BoltScript[] {
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
 */
function getScripts(): BoltScript[] {
  const config = vscode.workspace.getConfiguration("bolts");
  const scope = (config.get<ConfigScope>("configScope") ?? "effective") as ConfigScope;
  return getScriptsForScope(config, scope);
}

/**
 * Returns the ConfigurationTarget for the given scope (for config.update).
 */
function getConfigTarget(scope: "user" | "workspace"): vscode.ConfigurationTarget {
  return scope === "user" ? vscode.ConfigurationTarget.Global : vscode.ConfigurationTarget.Workspace;
}

/**
 * Resolves a script for the current OS: applies platform overrides (windows/linux/darwin)
 * and returns path (resolved to absolute), args, and shell. Path in result is still raw
 * for the current platform (will be resolved to absolute when running).
 */
function resolveScriptForOS(
  script: BoltScript,
  workspaceRoot: string | undefined,
  defaultShell: ShellId
): ResolvedScript {
  const plat = script[PLATFORM_KEY as keyof BoltScript] as BoltScriptPlatform | undefined;
  const rawPath = plat?.path ?? script.path;
  const rawArgs = plat?.args ?? script.args;
  const scriptShell = plat?.shell ?? script.shell ?? "os";

  const effectiveShell: ShellId =
    scriptShell === "os"
      ? defaultShell === "os"
        ? process.platform === "win32"
          ? "powershell"
          : "bash"
        : defaultShell
      : scriptShell;

  return {
    path: rawPath,
    args: rawArgs?.trim() || undefined,
    shell: effectiveShell,
  };
}

/**
 * Resolves script path to absolute and returns full ResolvedScript with absolute path.
 */
function resolveScriptForRun(
  script: BoltScript,
  workspaceRoot: string | undefined,
  defaultShell: ShellId
): ResolvedScript & { resolvedPath: string } {
  const resolved = resolveScriptForOS(script, workspaceRoot, defaultShell);
  const resolvedPath = resolveScriptPath(resolved.path, workspaceRoot);
  return { ...resolved, resolvedPath };
}

/** Returns terminal shellPath and shellArgs for the given shell type and OS. */
function getTerminalShellOptions(
  shellId: ShellId,
  wslDistro?: string
): { shellPath: string; shellArgs: string[] } {
  const isWin = process.platform === "win32";
  switch (shellId) {
    case "powershell":
      return { shellPath: "powershell.exe", shellArgs: ["-NoProfile", "-ExecutionPolicy", "Bypass"] };
    case "cmd":
      return { shellPath: "cmd.exe", shellArgs: [] };
    case "bash":
      return { shellPath: isWin ? "bash.exe" : "bash", shellArgs: [] };
    case "gitbash":
      return {
        shellPath: isWin
          ? path.join(process.env["ProgramFiles"] || "C:\\Program Files", "Git", "bin", "bash.exe")
          : "bash",
        shellArgs: [],
      };
    case "wsl": {
      const args = wslDistro?.trim() ? ["-d", wslDistro.trim()] : [];
      return { shellPath: "wsl.exe", shellArgs: args };
    }
    case "sh":
      return { shellPath: "sh", shellArgs: [] };
    case "os":
    default:
      return isWin
        ? { shellPath: "powershell.exe", shellArgs: ["-NoProfile", "-ExecutionPolicy", "Bypass"] }
        : { shellPath: "bash", shellArgs: [] };
  }
}

/**
 * Builds the command string to send to the terminal for the given shell type.
 * Path is absolute; args are appended. Quoting and invocation style are shell-specific.
 * For WSL, converts Windows path to WSL path and runs in script dir so cwd is correct.
 */
function buildRunCommand(
  shellId: ShellId,
  resolvedPath: string,
  args: string | undefined,
  scriptDir: string
): string {
  const quotedPath = resolvedPath.includes(" ") ? `"${resolvedPath}"` : resolvedPath;
  const argsPart = args?.trim() ? ` ${args.trim()}` : "";
  const isWin = process.platform === "win32";

  switch (shellId) {
    case "powershell":
      return `& '${resolvedPath.replace(/'/g, "''")}'${argsPart}`;
    case "cmd":
      return `${quotedPath}${argsPart}`;
    case "wsl": {
      const wslPath = windowsPathToWslPath(resolvedPath);
      const wslDir = windowsPathToWslPath(scriptDir);
      const quotedWslPath = wslPath.includes(" ") || wslPath.includes("'") ? `"${wslPath.replace(/"/g, '\\"')}"` : wslPath;
      const quotedWslDir = wslDir.includes(" ") || wslDir.includes("'") ? `"${wslDir.replace(/"/g, '\\"')}"` : wslDir;
      return `cd ${quotedWslDir} && ${quotedWslPath}${argsPart}`;
    }
    case "bash":
    case "gitbash":
    case "sh":
      return `${quotedPath}${argsPart}`;
    case "os":
    default:
      return isWin ? `${quotedPath}${argsPart}` : `${quotedPath}${argsPart}`;
  }
}

/**
 * Creates an integrated terminal with the chosen shell, sets cwd to the script directory,
 * and runs the script with optional args. Shell type controls PowerShell, cmd, bash, WSL, etc.
 * When shell is WSL, uses bolts.wslDistro if set and converts paths to WSL form.
 */
function runScriptInTerminal(
  resolvedPath: string,
  args: string | undefined,
  shellId: ShellId,
  wslDistro?: string
): void {
  const scriptDir = path.dirname(resolvedPath);
  const { shellPath, shellArgs } = getTerminalShellOptions(shellId, wslDistro);
  const runCommand = buildRunCommand(shellId, resolvedPath, args, scriptDir);

  const cwd = shellId === "wsl" && IS_WINDOWS ? windowsPathToWslPath(scriptDir) : scriptDir;
  const terminal = vscode.window.createTerminal({
    cwd,
    name: "BoltS",
    shellPath,
    shellArgs: shellArgs.length > 0 ? shellArgs : undefined,
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
  statusBarItem.tooltip = "BoltS: Run, add, or manage scripts";
  statusBarItem.command = "bolts.openMenu";
  statusBarItem.show();

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
    const scriptPath = await vscode.window.showInputBox({
      title: "BoltS: Add script",
      prompt: "Path: use ./ for workspace-relative, ~ for home, or absolute path",
      placeHolder: "./scripts/run.sh",
      value: "./",
      validateInput: (v) => (!v?.trim() ? "Enter a path" : undefined),
    });
    if (scriptPath === undefined || !scriptPath.trim()) {
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
