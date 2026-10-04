#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/runtime.sh"
umask 077
mkdir -p "$CUBE_OMB_TOOLS"

if ! require_node; then
  case "$(uname -s)-$(uname -m)" in
    Linux-x86_64) target=linux-x64; sha=fd8e59d5a511510f6a298afb548f18c7d2b1be404d8b4a27d94fbe49f56cb2d6 ;;
    Linux-aarch64|Linux-arm64) target=linux-arm64; sha=6ad1325edbdb5649c379b75a237147a666c95d4f9ae8d340fef2d1575d289ad2 ;;
    Darwin-arm64) target=darwin-arm64; sha=6239d4cf92d864487ec8cd3615038f7b67e7f58b77b21cd2f09ea9fbd68065fe ;;
    Darwin-x86_64) target=darwin-x64; sha=0ae5a24c24bb7d015cd816c5036b3f90f2945aa872fcf54e58da054753b3a299 ;;
    *) echo 'OpenMausBot needs Node 24+ on this architecture. Install it and retry.' >&2; exit 1 ;;
  esac
  stage="$(mktemp -d "$CUBE_OMB_TOOLS/node-download.XXXXXX")"
  trap 'rm -rf "$stage"' EXIT
  archive="node-v$CUBE_OMB_NODE_VERSION-$target.tar.xz"
  curl --fail --location --retry 3 "https://nodejs.org/dist/v$CUBE_OMB_NODE_VERSION/$archive" -o "$stage/$archive"
  if command -v sha256sum >/dev/null 2>&1; then
    actual="$(sha256sum "$stage/$archive" | cut -d ' ' -f 1)"
  else
    actual="$(shasum -a 256 "$stage/$archive" | cut -d ' ' -f 1)"
  fi
  [ "$actual" = "$sha" ] || { echo 'Node download checksum mismatch.' >&2; exit 1; }
  tar -xJf "$stage/$archive" -C "$stage"
  mv "$stage/node-v$CUBE_OMB_NODE_VERSION-$target" "$CUBE_OMB_TOOLS/node-v$CUBE_OMB_NODE_VERSION"
  rm -rf "$stage"
  trap - EXIT
fi

require_node || { echo 'OpenMausBot requires Node 24 or newer.' >&2; exit 1; }
pnpm_cli="$CUBE_OMB_TOOLS/pnpm/node_modules/pnpm/bin/pnpm.cjs"
if [ ! -f "$pnpm_cli" ] || [ "$(node "$pnpm_cli" --version)" != 10.33.0 ]; then
  npm install --prefix "$CUBE_OMB_TOOLS/pnpm" --no-save --ignore-scripts --no-audit --no-fund pnpm@10.33.0
fi

cd "$CUBE_OMB_ROOT"
# Headless installation needs neither Electron's download nor desktop hooks.
export ELECTRON_SKIP_BINARY_DOWNLOAD=1
node "$pnpm_cli" install --frozen-lockfile --ignore-scripts --filter openmausbot
node "$pnpm_cli" run build
node "$pnpm_cli" run build:server
echo 'OpenMausBot built. Claude/Codex reuse this user’s existing CLI sign-ins.'
