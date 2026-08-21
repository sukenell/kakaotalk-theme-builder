import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import test from "node:test";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const serveScript = path.join(repositoryRoot, "scripts/serve.mjs");

test("serve skips runtime env config writes when requested", async () => {
  const rootDirectory = await mkdtemp(path.join(os.tmpdir(), "theme-builder-serve-"));
  const configDirectory = path.join(rootDirectory, "src");
  const configPath = path.join(configDirectory, "env-config.js");
  const sentinel = "// keep this file unchanged\n";
  const port = await findAvailablePort();

  await mkdir(configDirectory);
  await writeFile(configPath, sentinel, "utf8");
  await writeFile(path.join(rootDirectory, "index.html"), "<!doctype html><title>fixture</title>", "utf8");

  const server = spawn(process.execPath, [serveScript], {
    cwd: rootDirectory,
    env: {
      ...process.env,
      PORT: String(port),
      SKIP_ENV_CONFIG: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  try {
    await waitForServer(server);
    assert.equal(await readFile(configPath, "utf8"), sentinel);
  } finally {
    await stopServer(server);
    await rm(rootDirectory, { recursive: true, force: true });
  }
});

async function findAvailablePort() {
  const probe = createServer();
  await new Promise((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", resolve);
  });
  const { port } = probe.address();
  await new Promise((resolve) => probe.close(resolve));
  return port;
}

async function waitForServer(server) {
  const timeout = setTimeout(() => {
    server.kill();
  }, 5_000);

  try {
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.once("exit", (code, signal) => {
        reject(new Error(`server exited before listening (code ${code}, signal ${signal})`));
      });
      server.stdout.on("data", (chunk) => {
        if (chunk.toString().includes("Serving ")) {
          resolve();
        }
      });
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function stopServer(server) {
  if (server.exitCode !== null || server.signalCode !== null) {
    return;
  }

  const exited = new Promise((resolve) => server.once("exit", resolve));
  server.kill();
  await exited;
}
