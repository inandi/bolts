/**
 * Shared BoltS types and constants used across the extension.
 *
 * @since 2.1.2 [02-03-2026]
 * @version 2.1.2
 */

/** Shell identifier: which terminal/shell to run the script in. */
export type ShellId = "os" | "powershell" | "cmd" | "bash" | "gitbash" | "wsl" | "sh";

/** Platform-specific overrides (path, args, shell) for a script. */
export interface BoltScriptPlatform {
  path?: string;
  args?: string;
  shell?: ShellId;
}

/** Script entry from bolts.scripts setting (alias, path, optional args, shell, OS overrides). */
export interface BoltScript {
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
export interface ResolvedScript {
  path: string;
  args: string | undefined;
  shell: ShellId;
}

/** Where to read scripts from: effective (default), user (global), or workspace (project). */
export type ConfigScope = "effective" | "user" | "workspace";

/** Current OS key for platform overrides. */
export const PLATFORM_KEY: "windows" | "linux" | "darwin" =
  process.platform === "win32" ? "windows" : process.platform === "darwin" ? "darwin" : "linux";

export const IS_WINDOWS = process.platform === "win32";
