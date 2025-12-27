# Decisions

- Identity persistence uses `data/identity.json` (via `bare-fs`/`bare-path`) with hex-encoded keys; a public-only projection is sent to the UI to avoid exposing the secret key.
- UI receives identity via `pear-pipe` to avoid direct access to the identity module or secret material.
