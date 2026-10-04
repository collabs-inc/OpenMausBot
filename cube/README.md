# OpenMausBot in Cube

Install `https://github.com/collabs-inc/OpenMausBot` in Cube. The manifest builds
the upstream web app and harness, then starts the harness in the foreground on
`127.0.0.1:$PORT`. No Docker, PostgreSQL, CopilotKit project, or new model key is
needed for local Claude chat.

The installer uses Node 24+ if available; otherwise it installs a checksum-pinned
Node 24.21.0 in `~/.cache/cube-openmausbot` (or `$XDG_CACHE_HOME/cube-openmausbot`).
Pinned pnpm 10.33.0 lives there too. Nothing is installed globally. Desktop
packaging and Electron downloads are skipped.

Claude, Codex, and other local engine CLIs are discovered using the server user's
PATH, including `~/.local/bin`. Run Cube and the CLIs as the same operating-system
user. The wrapper preserves HOME and the CLIs use their existing sign-ins. It
does not read, copy, or replace their credential files. Settings → Engines shows
availability and allows choosing a custom CLI path.

Chats, settings, SQLite databases, and bot workspaces stay in the upstream
`~/.openmausbot` directory, outside the checkout, and survive Cube updates.
`OMB_DATA_DIR` can select another directory. Back it up with the app stopped.

## Authentication

Only the Cube start command enables `OMB_CUBE_GATEWAY=1`. In that mode, a
loopback connection carrying a Cube app hostname or localhost is the single
workspace owner already authenticated by Cube. Browser requests must be
same-origin, and cross-site fetches are refused. Normal upstream launches keep
their existing pairing and authentication behavior. The server remains bound
to loopback; the Cube gateway is its only remote entrance. Do not put an
unauthenticated proxy in front of this mode.

Cube manages frame headers so the upstream UI can appear inside its app pane.
Claude tool approvals remain in OpenMausBot. This integration does not enable
unattended/full-access mode or automatically provision a computer.

Local chat works with an installed, signed-in CLI. Browser/computer control,
connected apps, and hosted voices retain upstream's optional setup requirements.
The separate webhook receiver uses a free loopback port; it is not exposed by
Cube. See upstream's [self-hosting guide](../docs/self-hosting.md) for those
capabilities.
