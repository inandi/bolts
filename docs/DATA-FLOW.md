# BoltS Data Flow

This document focuses on how data moves through BoltS when scripts are listed, added, edited, and executed.

---

## 1. Configuration and script list

```mermaid
sequenceDiagram
  participant VS as VS Code
  participant C as bolts config
  participant B as BoltS

  VS->>B: fire bolts.openMenu
  B->>C: get bolts.configScope
  B->>C: read bolts.scripts (user / workspace / effective)
  C-->>B: scripts[]
  B-->>VS: Quick Pick menu items
```

- **Source of truth**: `bolts.scripts` in VS Code settings.
- **Scope selection**: Controlled by `bolts.configScope` (`effective`, `user`, `workspace`).
- **Validation**: Only entries with a string `alias` and `path` are used.

When adding or editing scripts:

```mermaid
flowchart LR
  Add[Add / Manage UI] --> ReadC[Read scripts\nfor chosen scope]
  ReadC --> Update[Apply add / edit / delete]
  Update --> WriteC[Write bolts.scripts\nback to settings]
```

---

## 2. Script execution path

```mermaid
sequenceDiagram
  participant U as User
  participant B as BoltS
  participant C as bolts config
  participant R as Resolver
  participant T as Terminal

  U->>B: Select alias in Run Scripts
  B->>C: get bolts.defaultShell, bolts.wslDistro
  B->>R: resolveScriptForRun(script, workspaceRoot, defaultShell)
  R->>R: apply OS overrides (windows/linux/darwin)
  R->>R: resolveScriptPath(rawPath, workspaceRoot)
  R-->>B: { resolvedPath, args, shell }
  B->>B: fs.existsSync(resolvedPath)?
  alt not found
    B-->>U: show error "Script not found"
  else found
    B->>T: create BoltS terminal (shellPath, shellArgs, cwd)
    B->>T: send command (script path + args)
  end
```

Key details:

- **Path resolution**
  - `./` → relative to the first workspace folder (or home if none).
  - `~/` → relative to the current user’s home directory.
  - Absolute paths (`/…`, `C:\…`) are used as-is.
- **Per-OS overrides**
  - If present, `windows` / `linux` / `darwin` blocks can override `path`, `args`, and `shell`.
- **Shell selection**
  - Per-script `shell` (if set) wins over `bolts.defaultShell`.
  - `bolts.defaultShell = os` falls back to PowerShell on Windows and bash on Linux/macOS.

---

## 3. WSL-specific behavior (Windows)

When a script uses the `wsl` shell:

```mermaid
flowchart LR
  R[Resolved Windows path] --> Conv[Convert to WSL path]
  Conv --> Term[WSL terminal\n(wsl.exe, optional distro)]
  Term --> Run[cd script dir\n+ run script]
```

- The script path and working directory are converted from Windows style to WSL style.
- `bolts.wslDistro` (if set) controls which distro `wsl.exe` launches.

