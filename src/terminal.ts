import * as vscode from "vscode";
import * as path from "path";
import type { ShellId } from "./types";
import { IS_WINDOWS } from "./types";

/**
 * Converts a Windows path to a WSL path (e.g. C:\foo\bar -> /mnt/c/foo/bar).
 * Paths already starting with / (WSL-style) are returned as-is. Handles \\wsl$\...
 *
 * @since 2.1.2 [02-03-2026]
 * @version 2.1.2
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
    const rest = normalized
      .replace(/^\/\/wsl\$\/[^/]+/i, "")
      .replace(/^\/\/wsl\.localhost\/[^/]+/i, "")
      .replace(/\\/g, "/");
    return rest.startsWith("/") ? rest : `/${rest}`;
  }
  return normalized.replace(/\\/g, "/");
}

/**
 * Returns terminal shellPath and shellArgs for the given shell type and OS.
 *
 * @since 2.1.2 [02-03-2026]
 * @version 2.1.2
 */
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
 *
 * @since 2.1.2 [02-03-2026]
 * @version 2.1.2
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
      const quotedWslPath =
        wslPath.includes(" ") || wslPath.includes("'") ? `"${wslPath.replace(/"/g, '\\"')}"` : wslPath;
      const quotedWslDir =
        wslDir.includes(" ") || wslDir.includes("'") ? `"${wslDir.replace(/"/g, '\\"')}"` : wslDir;
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
 *
 * @since 2.1.2 [02-03-2026]
 * @version 2.1.2
 */
export function runScriptInTerminal(
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

