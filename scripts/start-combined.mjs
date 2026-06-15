// Runs DB migrations, then the Next.js web server AND the pg-boss ingestion worker
// in one container. Used by Dockerfile.web so a single Railway service covers
// everything — keeping the deploy at 2 resources (this service + Postgres), which
// fits Railway's free trial. No Pre-Deploy Command needed on the host.
//
// Lifecycle: migrations run first (idempotent — see scripts/migrate.ts). If they
// fail, startup aborts so the deploy fails loudly instead of serving a broken app.
// Once serving, if either child exits we tear the container down for a clean restart.
import { spawn } from "node:child_process";

const children = [];
let shuttingDown = false;

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    try {
      child.kill("SIGTERM");
    } catch {
      /* already gone */
    }
  }
  setTimeout(() => process.exit(code), 3000).unref();
}

// One-shot command: resolve on success (exit 0), reject otherwise.
function runOnce(name, cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", env: process.env });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`"${name}" exited with code ${code}`)),
    );
  });
}

// Long-lived service: if it exits, tear the whole container down for a clean restart.
function runService(name, cmd, args) {
  const child = spawn(cmd, args, { stdio: "inherit", env: process.env });
  child.on("exit", (code, signal) => {
    console.log(`[start-combined] "${name}" exited (code=${code} signal=${signal}) — restarting container`);
    shutdown(code ?? 1);
  });
  child.on("error", (err) => {
    console.error(`[start-combined] "${name}" failed to start:`, err.message);
    shutdown(1);
  });
  children.push(child);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

// 1) Apply migrations before anything serves traffic.
console.log("[start-combined] running migrations…");
try {
  await runOnce("migrate", "npm", ["run", "db:migrate"]);
} catch (err) {
  console.error("[start-combined] migration failed — aborting startup:", err.message);
  process.exit(1);
}

// 2) Launch web + worker via their workspace start scripts.
runService("web", "npm", ["run", "start", "--workspace", "apps/web"]);
runService("worker", "npm", ["run", "start", "--workspace", "apps/worker"]);
console.log("[start-combined] launched web + worker");
