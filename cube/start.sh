#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/runtime.sh"
require_node || { echo 'Node 24+ is missing. Reinstall OpenMausBot in Cube.' >&2; exit 1; }
node -e 'const p=Number(process.env.PORT); if (!Number.isInteger(p) || p<1 || p>65535) { console.error("Cube must supply PORT (1–65535)."); process.exit(1); }'
umask 077
export OMB_DATA_DIR="${OMB_DATA_DIR:-$HOME/.openmausbot}"
mkdir -p "$OMB_DATA_DIR"
export OMB_PORT="$PORT"
# An unused loopback port for the separate, optional webhook receiver.
export OMB_WEBHOOK_PORT=0
export OMB_STATIC_DIR="$CUBE_OMB_ROOT/dist"
export OMB_CUBE_GATEWAY=1
cd "$CUBE_OMB_ROOT"
exec node "$CUBE_OMB_ROOT/dist-server/index.js"
