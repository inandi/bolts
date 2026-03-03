# BoltS Architecture

This document describes how the BoltS extension is structured internally and how the main pieces interact.

---

## High-level components

- **Extension entry (`extension.ts`)**
  - Registers commands: `bolts.openMenu`, `bolts.runScripts`, `bolts.addScript`, `bolts.manageScripts`.
  - Creates the status bar item (`$(zap) BoltS`) and wires it to `bolts.openMenu`.
- **Configuration layer**
  - Reads `bolts.*` settings from VS Code (`bolts.scripts`, `bolts.configScope`, `bolts.defaultShell`, `bolts.wslDistro`).
  - Supports user, workspace, or effective configuration selection.
- **Script resolution layer**
  - Applies per-OS overrides (`windows` / `linux` / `darwin`).
  - Resolves relative / home / absolute paths to an absolute filesystem path.
  - Determines the effective shell to use per script.
- **Execution layer**
  - Creates a `BoltS` integrated terminal with the correct shell and working directory.
  - Builds the shell-specific command string and sends it to the terminal.

---

## Component diagram

```mermaid
flowchart LR
  VS[VS Code host] --> Ext[extension.ts]
  Ext --> Cmds[Commands\nbolts.*]
  Ext --> SB[Status bar item]
  Cmds --> Config[Configuration layer\n(bolts.* settings)]
  Cmds --> Resolver[Script resolution\n(path + shell)]
  Resolver --> Exec[Execution layer\n(terminal + command)]
  Exec --> Term["VS Code terminal\n(name: BoltS)"]
```

---

## Commands and responsibilities

- **`bolts.openMenu`**
  - Reads configured scripts.
  - Builds the small main menu: **Run script**, **Add script**, **Manage scripts**.
  - Delegates to `bolts.runScripts`, `bolts.addScript`, or `bolts.manageScripts`.

- **`bolts.runScripts`**
  - Loads scripts via `getScripts()` (respecting `bolts.configScope`).
  - Opens a Quick Pick of aliases.
  - For the chosen script, calls `resolveScriptForRun()` then `runScriptInTerminal()`.

- **`bolts.addScript`**
  - Prompts the user for alias, path, args, and shell.
  - Asks whether to save to **user** or **workspace** scope.
  - Updates `bolts.scripts` at the chosen scope.

- **`bolts.manageScripts`**
  - Lets the user pick a scope (user / workspace) and a script.
  - Supports **Edit** (alias, path, args, shell) or **Delete**.
  - Writes the updated `bolts.scripts` array back to settings.

---

## Key helper functions

- **`getScripts()` / `getScriptsForScope()`**
  - Read and validate the `bolts.scripts` array for the active scope.
- **`resolveScriptForOS()` / `resolveScriptForRun()`**
  - Apply OS-specific overrides, choose the shell, and resolve the final path.
- **`resolveScriptPath()`**
  - Normalize `./`, `~/`, and absolute paths using the workspace root or home directory.
- **`getTerminalShellOptions()` / `buildRunCommand()` / `runScriptInTerminal()`**
  - Choose the correct shell binary and arguments (including WSL).
  - Build a shell-appropriate command and send it to a `BoltS` terminal.

