# BoltS: The Lightning-Fast Script Launcher

**BoltS** is a VS Code extension designed to bridge the gap between your editor and your local shell scripts. It allows you to pin a "Script Menu" directly to your status bar, giving you one-click access to any automation script, whether it's buried in your current project or tucked away in a global `~/scripts` folder.

---

## 1. Why do we need BoltS?

Most developers have a collection of "helper" scripts (database resets, deployment triggers, log cleaners). Currently, running them requires:

* **Memorizing paths:** "Where did I put that `deploy.sh`?"
* **Terminal friction:** Manual typing like `cd ../scripts && ./run.sh`.
* **Context switching:** Leaving your code to find a terminal window or a specific folder.

**BoltS** solves this by providing:

* **Aliases:** Use a friendly name like "Reset DB" instead of a long file path.
* **Global Access:** Run scripts located *outside* your workspace (e.g., system-wide utilities).
* **Zero-Clutter UI:** It stays out of your way in the status bar until you need it.

---

## 2. Development Overview

Building **BoltS** involves three main stages of development:

### Stage A: Configuration & Manifest (`package.json`)

We define how **BoltS** talks to VS Code.

* **Settings:** We create a "Contribution Point" for an array of objects. Each object needs an `alias` (the display name) and a `path` (the actual location).
* **Iconography:** We use the `$(zap)` Codicon to give the status bar a distinct look.

### Stage B: The UI Logic (`extension.ts`)

This is the "Glue" code.

1. **Status Bar Initialization:** We create a `StatusBarItem` that stays visible as long as the extension is active.
2. **The QuickPick Menu:** When clicked, the extension reads the user's settings and generates a searchable list. This is much faster than a standard dropdown.

### Stage C: Execution Engine

This is where the "work" happens.

1. **Path Resolution:** The extension must intelligently handle paths. If a path starts with `./`, it looks in the project. If it starts with `~` or `/`, it looks at the system level.
2. **Terminal Integration:** Instead of running the script in a hidden background process (where it might fail silently), **BoltS** sends the command to an integrated VS Code terminal. This allows the user to see the output and interact with the script if it asks for input.

---

## 3. Workflow Diagram

1. **User Actions:** Clicks **$(zap) BoltS** on the status bar.
2. **Extension Logic:** Fetches script list from `settings.json`.
3. **UI Feedback:** Opens a searchable Quick Pick list.
4. **Execution:** User selects a script; BoltS resolves the path and executes it in the terminal.

---

## 4. Key Tech Stack

* **Language:** TypeScript (Industry standard for VS Code extensions).
* **Tools:** `yo code` (for scaffolding), `vsce` (for packaging and publishing).
* **APIs:** `vscode.window.createStatusBarItem`, `vscode.window.showQuickPick`, and `vscode.window.createTerminal`.

---

## Next Step

**Would you like me to help you set up the "Path Resolver" function so it can handle the `~` (home) directory shortcut on Mac/Linux and Windows?**
