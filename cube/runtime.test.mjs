import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

test("a newly installed private Node replaces Bash's cached unsupported Node", () => {
  const home = mkdtempSync(join(tmpdir(), "cube-omb-node-"));
  try {
    const fallback = join(home, "old-bin");
    mkdirSync(fallback);
    // Model an unsupported system Node: the version predicate exits nonzero.
    // Bash's executable lookup and the replacement Node are both real.
    writeFileSync(join(fallback, "node"), "#!/bin/sh\nexit 1\n", { mode: 0o700 });
    const shell = spawnSync("/bin/bash", ["-c", `
      source "$CUBE_RUNTIME"
      if require_node; then exit 10; fi
      mkdir -p "$CUBE_OMB_TOOLS/node-v$CUBE_OMB_NODE_VERSION/bin"
      ln -s "$CUBE_REAL_NODE" "$CUBE_OMB_TOOLS/node-v$CUBE_OMB_NODE_VERSION/bin/node"
      require_node
    `], {
      env: {
        HOME: home,
        XDG_CACHE_HOME: join(home, "cache"),
        PATH: `${fallback}:/usr/bin:/bin`,
        CUBE_RUNTIME: fileURLToPath(new URL("./runtime.sh", import.meta.url)),
        CUBE_REAL_NODE: process.execPath,
      },
      encoding: "utf8",
    });
    assert.equal(shell.status, 0, shell.stderr || "Bash kept using the unsupported system Node after installation");
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
