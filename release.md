## New Features
- **Config scope**: Choose where to read scripts — effective (workspace overrides user), user (global), or workspace (project). Setting: `bolts.configScope`.
- **Add script (UI)**: Command "BoltS: Add script" with optional arguments and choice to save to User (global) or Workspace (project).
- **Manage scripts**: Command "BoltS: Manage scripts (edit/delete)" — edit or delete scripts per scope (user/workspace).
- **Status bar menu**: Clicking the BoltS status bar opens a menu: Run script (when configured), Add script, Manage scripts. No more "No scripts configured" notification on click.
- **Script arguments**: Optional `args` per script (e.g. `--ABCD 1`). Add/Edit UI and setting `bolts.scripts[].args`.
- **Shell/terminal choice**: Run scripts in PowerShell, CMD, Bash, Git Bash, WSL, or sh. Default via `bolts.defaultShell`; per-script override via `shell`.
- **OS-level handling**: Per-script overrides for Windows, Linux, and macOS: `windows`, `linux`, `darwin` with optional `path`, `args`, `shell` so one alias can use different paths/shells per OS.
- **WSL support**: Shell option "WSL" with Windows→WSL path conversion, correct cwd in WSL, and optional `bolts.wslDistro` to target a specific distro.

## Improvements
- Scripts are resolved for the current OS before run (platform overrides applied).
- WSL: `\\wsl$\...` and `//wsl.localhost/...` paths converted to Linux paths; paths with spaces quoted correctly.
- Run/Manage pickers show path and args in the description.
