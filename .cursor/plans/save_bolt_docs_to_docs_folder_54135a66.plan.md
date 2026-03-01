---
name: Save Bolt docs to docs folder
overview: Create a `docs` folder and save the provided Bolt specification as structured documentation, without implementing any extension code.
todos: []
isProject: false
---

# Save Bolt documentation to docs folder

## Current state

- Repo root has only [README.md](README.md) (minimal: "# bolt").
- No `docs` folder exists yet.

## What will be done

1. **Create `docs/`** at the project root.
2. **Add a single overview document** that captures the full spec you provided:
  - **File:** [docs/OVERVIEW.md](docs/OVERVIEW.md)
  - **Contents:** The exact Bolt specification from your message, preserved and formatted in Markdown:
    - **1. Why do we need Bolt?** — Problem (memorizing paths, terminal friction, context switching) and solution (aliases, global access, zero-clutter UI).
    - **2. Development Overview** — Stage A (Configuration & Manifest), Stage B (UI Logic in `extension.ts`), Stage C (Execution Engine: path resolution, terminal integration).
    - **3. Workflow Diagram** — User click → fetch scripts → Quick Pick → path resolve and run in terminal.
    - **4. Key Tech Stack** — TypeScript, `yo code`, `vsce`, VS Code APIs.
    - **Next Step** — Path Resolver question (kept as-is for future work).
3. **Optional:** Add a short [docs/README.md](docs/README.md) that points to `OVERVIEW.md` (e.g., "Start here: [OVERVIEW.md](OVERVIEW.md)") so the docs folder is self-explanatory. This is optional and can be skipped if you prefer a single file.

## What will not be done

- No extension code, `package.json` contributions, or implementation.
- No coding of the Path Resolver or any other feature.

## Result

After execution, you will have:

- `docs/OVERVIEW.md` — Full Bolt spec, ready to reference when you start coding.

If you want the docs split into multiple files (e.g., `docs/development-stages.md`, `docs/workflow.md`) or a different filename than `OVERVIEW.md`, say how you’d like it structured and the plan can be adjusted.