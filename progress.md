# Progress

## 2025-12-27 16:55 — F-000 Tracking migration
- Summary: Moved tracking to root files (`codex.md`, `feature_list.json`, `progress.md`) and updated `project/init.sh` to reference the root feature list.
- Files: codex.md, feature_list.json, progress.md, project/init.sh, decisions.md
- Commands: none
- Results: N/A
- Commit: (pending)
- Next: F-001 Boot baseline: Pear GUI opens reliably
- Notes: Legacy `project/` tracking files removed; root files are now the source of truth.

## 2025-12-27 00:00 — F-004 Local identity persistence
- Summary: Implemented local identity persistence; public identity display via pipe; unit tests added.
- Files: identity.js, index.js, ui/app.js, test/identity.test.js
- Commands:
  - npm test
- Results: PASS (unit tests)
- Commit: 288571c feat(phase3-identity): persist identity + UI
- Next: F-001 Boot baseline: Pear GUI opens reliably
- Notes: Pear GUI runtime cannot import Node 'fs'; use bare-fs/bare-path.
