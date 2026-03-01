<div align="center">
  <h1>BoltS [Beta]</h1>
  <p><strong>The Lightning-Fast Script Launcher</strong></p>
</div>

Tired of memorizing script paths or switching to a terminal to run them? BoltS pins a Script Menu to your status bar—one click, pick a script by alias, and it runs in the integrated terminal.

## What is BoltS?

BoltS is a VS Code extension that gives you one-click access to your shell scripts. Configure a list of scripts (with friendly aliases and paths) in settings; click **BoltS** in the status bar to open a searchable Quick Pick menu and run any script in the integrated terminal.

## Why Use BoltS?

- **Aliases**: Use names like "Reset DB" or "Deploy" instead of remembering full paths
- **Global Access**: Run scripts outside your workspace (e.g. `~/scripts/backup.sh`) as well as project-local ones
- **Zero-Clutter UI**: Stays in the status bar until you need it—no panels or sidebars
- **Path Flexibility**: Paths can be workspace-relative (`./scripts/...`), home-relative (`~/scripts/...`), or absolute
- **Visible Output**: Scripts run in the integrated terminal so you see output and can interact if the script prompts for input
- **Searchable Menu**: Quick Pick lets you type to filter scripts by alias

## Getting Started

### Installation

1. Open VS Code or Cursor
2. Go to the Extensions view
3. Search for **BoltS**
4. Click Install

### First Steps

1. **Open Settings** and find **BoltS: Scripts** (`bolts.scripts`), or add to your `settings.json`:
2. Add script entries with an **alias** (display name) and **path** (script location):

```json
"bolts.scripts": [
  { "alias": "Reset DB", "path": "./scripts/reset-db.sh" },
  { "alias": "Deploy", "path": "~/scripts/deploy.sh" }
]
```

3. **Click the BoltS icon** (⚡) in the status bar
4. **Pick a script** from the Quick Pick list—it runs in a new **BoltS** terminal

## How It Works

### Path Resolution

- **`./path`** – Relative to the workspace root (or home if no folder is open)
- **`~/path`** – Relative to your home directory (Mac, Linux, Windows)
- **`/path`** or **`C:\path`** – Absolute path, used as-is

### Settings

Configure scripts in **BoltS: Scripts** (`bolts.scripts`). Each entry has:

- **alias** – Label shown in the menu (e.g. "Reset DB", "Deploy")
- **path** – Path to the script using the rules above

If the resolved path does not exist, BoltS shows an error and does not run the script.

## Development

```bash
npm install
npm run compile
```

Press **F5** to launch the Extension Development Host.

## Support the Project

If BoltS helps your workflow, you can support the project (no pressure):

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-ffdd00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/igobinda)

## Need Help?

- **Overview**: See [docs/OVERVIEW.md](docs/OVERVIEW.md) for the full spec and development overview
- **Issues**: Found a bug or have an idea? Open an issue on GitHub
- **Repository**: [github.com/iNandi/bolt](https://github.com/iNandi/bolt)

## License

This project is licensed under the MIT License.

---

**Made with ❤️ by Gobinda Nandi**
