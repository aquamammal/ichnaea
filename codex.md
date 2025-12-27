# ICHNAEA — Codex Contract

## Project Overview

**What it is**
ICHNAEA is a desktop-only, peer-to-peer location sharing app built on Pear/Holepunch with no central servers.

**Who it’s for**
Privacy-focused users who want mutual-consent, end-to-end encrypted location sharing between selected peers.

**What success looks like**
A stable Pear desktop app where peers can mutually consent, establish encrypted relationships, and share only last-known location locally.

## Non-Negotiable Constraints

- Pure P2P; no central servers.
- Mutual consent required before sharing.
- End-to-end encrypted relationships.
- Local persistence only; no cloud storage; last-known location only.
- Desktop only (Linux/macOS/Windows).
- JavaScript ESM only; no frameworks.
- Pear runtime + Holepunch stack.

## Repository Layout

```
.
├─ index.js
├─ identity.js
├─ ui/
│  ├─ index.html
│  └─ app.js
├─ test/
├─ feature_list.json
├─ progress.md
├─ project/
│  └─ init.sh
└─ codex.md
```

**Entrypoints**
- Main process: `index.js`
- UI: `ui/index.html` (loads `ui/app.js`)

## How to Run

- Install deps: `npm install`
- Dev app: `pear run -d .`

**Expected output**
A Pear desktop window opens and renders “ICHNAEA”; status lines indicate DOM available.

## How to Test

- Unit tests: `npm test`
- Manual UI smoke: `pear run -d .`

**Pass/Fail**
- Unit tests must report PASS.
- Manual smoke passes if the GUI window opens and UI renders.

## Environment & Configuration

- Required tools: `node`, `npm`, `pear`.
- Env vars: none currently.

## Operational Rules for Agents

- One feature per iteration; pick the first `status.implemented: false` in `feature_list.json`.
- Must run tests listed in the feature’s `test_plan`.
- Update `feature_list.json` and `progress.md` with factual evidence.
- Commit in a mergeable, runnable state.
- Do not change feature scope or acceptance criteria.

## Definition of Done

A feature is done only when:

- The test plan executed successfully.
- `feature_list.json` status updated with evidence.
- `progress.md` updated with a new entry.
- A commit is created and the working tree is clean.

## Known Risks / Sharp Edges

- `pear run -d` requires a path (use `pear run -d .`).
- Pear GUI runtime cannot import Node built-ins like `fs`/`path`; use `bare-fs`/`bare-path` for file IO.
- `Pear.updates` is deprecated and can crash on some builds; do not call it.

## Governance

`codex.md` may only be updated to add missing factual run/test info, document verified sharp edges, or correct incorrect instructions.
