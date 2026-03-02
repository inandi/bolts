# Release v2.1.4 - 2026-03-02

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
- Architecture and data flow documentation added to clarify how BoltS works internally.
- README and development instructions updated to reflect the latest behavior and simplify contributor setup.
- Refactored core extension files to improve structure, readability, and long‑term maintainability without changing user-facing behavior.
- Simplified BoltS versioning and removed legacy beta/wave-2 labels from documentation for clearer release messaging.

---

# Release v1.1.5 - 2026-03-01

## Improvements
- Renamed extension from Bolt to BoltS across code, docs, and UI.
- Configuration key changed from `bolt.scripts` to `bolts.scripts`; existing users must update their settings.
- Version set to 1.1.5; README, OVERVIEW, and CHANGELOG updated for consistent branding.

---

# Release v1.1.2 - 2026-03-01

## New Features
- Status bar launcher with ⚡ Bolt icon; one click opens the Script Menu
- Searchable Quick Pick menu of scripts configured in `bolt.scripts` (alias + path)
- Path resolution: workspace-relative (`./`), home-relative (`~/`), and absolute paths (Mac, Linux, Windows)
- Scripts run in the integrated terminal with cwd set to the script directory; output visible and interactive
- Friendly messages when no scripts are configured or when the resolved script path does not exist

## Improvements
- Initial release
---
