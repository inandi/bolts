import * as path from "path";
import * as os from "os";
import type { BoltScript, ResolvedScript, ShellId } from "./types";
import { PLATFORM_KEY } from "./types";

/**
 * Resolves a script path from user settings to an absolute filesystem path.
 * - Paths starting with ./ are relative to the workspace root.
 * - Paths starting with ~ are relative to the user's home directory (Mac/Linux/Windows).
 * - Paths starting with / (Unix) or a drive letter (Windows) are used as absolute.
 *
 * @since 2.1.2 [02-03-2026]
 * @version 2.1.2
 */
export function resolveScriptPath(rawPath: string, workspaceRoot: string | undefined): string {
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
 * Resolves a script for the current OS: applies platform overrides (windows/linux/darwin)
 * and returns path (resolved to absolute), args, and shell. Path in result is still raw
 * for the current platform (will be resolved to absolute when running).
 *
 * @since 2.1.2 [02-03-2026]
 * @version 2.1.2
 */
export function resolveScriptForOS(
  script: BoltScript,
  workspaceRoot: string | undefined,
  defaultShell: ShellId
): ResolvedScript {
  const plat = script[PLATFORM_KEY];
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
 *
 * @since 2.1.2 [02-03-2026]
 * @version 2.1.2
 */
export function resolveScriptForRun(
  script: BoltScript,
  workspaceRoot: string | undefined,
  defaultShell: ShellId
): ResolvedScript & { resolvedPath: string } {
  const resolved = resolveScriptForOS(script, workspaceRoot, defaultShell);
  const resolvedPath = resolveScriptPath(resolved.path, workspaceRoot);
  return { ...resolved, resolvedPath };
}

