# ICHNAEA

Desktop-only, peer-to-peer location sharing app built on Pear/Holepunch. No central servers; mutual consent; end-to-end encrypted; local persistence only.

## Run

- Install deps: `npm install`
- Dev app: `pear run -d .` (or `npm run dev`)

## Test

- Core tests: `npm test`
- UI smoke: not automated yet (manual launch recommended)

## Repo Structure

- `index.js` - Pear main process entrypoint
- `identity.js` - identity generation + persistence
- `ui/` - UI assets (`ui/index.html`, `ui/app.js`)
- `test/` - brittle tests
- `project/` - tracking files and init scripts

## Environment Variables

- None currently

## Conventions / Definition of Done

- One feature per iteration, first incomplete in `project/features.json`.
- Tests must pass for the feature's test plan.
- Update `project/features.json` + `project/progress.md` with facts.
- App must remain runnable after each commit.
