#!/usr/bin/env bash
# Sourced by install/start. App tools live outside the replaceable checkout.
set -euo pipefail
CUBE_OMB_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CUBE_OMB_TOOLS="${XDG_CACHE_HOME:-$HOME/.cache}/cube-openmausbot"
CUBE_OMB_NODE_VERSION=24.21.0
export PATH="$CUBE_OMB_TOOLS/node-v$CUBE_OMB_NODE_VERSION/bin:$HOME/.local/bin:$PATH"

require_node() {
  # install.sh may just have populated the private bin directory. Bash can
  # otherwise keep the unsupported system Node cached from the first check.
  hash -r
  command -v node >/dev/null 2>&1 && node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 24 ? 0 : 1)' >/dev/null 2>&1
}
