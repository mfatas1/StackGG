// Runs the Next.js web server AND the pg-boss ingestion worker in one container.
// Used by Dockerfile.web so a single Railway service covers both — which keeps the
// deployment at 2 resources (this service + Postgres) and fits Railway's free trial.
//
// Lifecycle: if either child exits, we tear the whole container down so the platform
// restarts it cleanly (no silently-dead worker behind a healthy web server).
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
  // Give children a moment to flush, then exit.
  setTimeout(() => process.exit(code), 3000).unref();
}

function run(name, cmd, args) {
  const child = spawn(cmd, args, { stdio: "inherit", env: process.env });
  child.on("exit", (exitCode, signal) => {
    console.log(`[start-combined] "${name}" exited (code=${exitCode} signal=${signal}) — restarting container`);
    shutdown(exitCode ?? 1);
  });
  child.on("error", (err) => {
    console.error(`[start-combined] "${name}" failed to start:`, err.message);
    shutdown(1);
  });
  children.push(child);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

// Both run via their workspace `start` scripts (web binds $PORT; worker runs tsx).
run("web", "npm", ["run", "start", "--workspace", "apps/web"]);
run("worker", "npm", ["run", "start", "--workspace", "apps/worker"]);

console.log("[start-combined] launched web + worker");
