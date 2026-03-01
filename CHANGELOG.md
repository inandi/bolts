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
