import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { request } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, expect, it } from "vitest";
import { waitForExit, removeTempDir } from "./testing/cleanup.ts";
import { freePortBlock } from "./testing/ports.ts";

let home: string;
let child: ChildProcess;
let base: string;
let log = "";
const cubeHeaders = {
  host: "openmausbot-ab12cd34.cube.site",
  "x-forwarded-proto": "https",
  origin: "https://openmausbot-ab12cd34.cube.site",
};

// Node's fetch ignores a supplied Host. Use HTTP directly to exercise the
// hostname Cube actually forwards, rather than accidentally testing localhost.
function gatewayRequest(path: string, headers: Record<string, string> = cubeHeaders, body?: string): Promise<Response> {
  return new Promise((resolve, reject) => {
    const req = request(`${base}${path}`, { method: body ? "POST" : "GET", headers }, res => {
      const chunks: Buffer[] = [];
      res.on("data", chunk => chunks.push(chunk));
      res.on("end", () => resolve(new Response(Buffer.concat(chunks), { status: res.statusCode })));
      res.on("error", reject);
    });
    req.on("error", reject);
    req.end(body);
  });
}

beforeAll(async () => {
  home = mkdtempSync(join(tmpdir(), "omb-cube-gateway-"));
  const data = join(home, ".openmausbot");
  const ui = join(home, "ui");
  mkdirSync(data);
  mkdirSync(ui);
  writeFileSync(join(ui, "index.html"), "<title>OpenMausBot fixture</title>");
  const port = await freePortBlock([0]);
  base = `http://127.0.0.1:${port}`;
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  const offline = `data:text/javascript,${encodeURIComponent('globalThis.fetch = async () => new Response("offline fixture", { status: 503 });')}`;
  child = spawn(process.execPath, ["--import", offline, join(root, "server/index.ts")], {
    cwd: root,
    env: {
      PATH: dirname(process.execPath), HOME: home, USERPROFILE: home,
      OMB_DATA_DIR: data, OMB_PORT: String(port), OMB_WEBHOOK_PORT: "0",
      OMB_STATIC_DIR: ui, OMB_CUBE_GATEWAY: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout?.on("data", chunk => { log += chunk; });
  child.stderr?.on("data", chunk => { log += chunk; });
  const deadline = Date.now() + 25_000;
  for (;;) {
    if (child.exitCode !== null) throw new Error(`fixture exited: ${log}`);
    try {
      const response = await fetch(`${base}/api/health`);
      if (response.ok && (await response.json() as { pid?: number }).pid === child.pid) break;
    } catch { /* starting */ }
    if (Date.now() > deadline) throw new Error(`fixture startup timed out: ${log}`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}, 30_000);

afterAll(async () => {
  if (child) await waitForExit(child, { signal: "SIGTERM" });
  if (home) await removeTempDir(home);
});

it("serves the app and authenticates Cube's single owner through the real HTTP entry", async () => {
  const page = await gatewayRequest("/");
  expect(page.status).toBe(200);
  expect(await page.text()).toContain("OpenMausBot fixture");
  const session = await gatewayRequest("/api/auth/session");
  const actor = await session.json();
  expect(session.status, JSON.stringify(actor)).toBe(200);
  expect(actor).toMatchObject({ kind: "loopback", scopes: ["admin", "client"] });
  const bots = await gatewayRequest("/api/bots");
  expect(bots.status).toBe(200);
});

it("rejects a foreign host or browser origin before any bot mutation", async () => {
  for (const headers of [
    { ...cubeHeaders, origin: "https://evil.example" },
    { ...cubeHeaders, host: "evil.example", origin: "https://evil.example" },
    { ...cubeHeaders, "sec-fetch-site": "cross-site" },
  ]) {
    const response = await gatewayRequest("/api/bots", { ...headers, "content-type": "application/json" },
      JSON.stringify({ name: "Must not be created" }));
    expect(response.status).toBe(403);
  }
});
