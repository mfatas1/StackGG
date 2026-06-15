// Runs DB migrations (idempotent), then the Next.js web server. The pg-boss worker
// runs as its own Railway service (Dockerfile.worker), so this no longer launches it.
// Migrations live here so the deploy self-migrates with no Pre-Deploy Command needed.
import { spawn } from "node:child_process";

function runOnce(name, cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", env: process.env });
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`"${name}" exited with code ${code}`))));
  });
}

console.log("[start-web] running migrations…");
try {
  await runOnce("migrate", "npm", ["run", "db:migrate"]);
} catch (err) {
  console.error("[start-web] migration failed — aborting startup:", err.message);
  process.exit(1);
}

console.log("[start-web] starting web server…");
const web = spawn("npm", ["run", "start", "--workspace", "apps/web"], { stdio: "inherit", env: process.env });
web.on("exit", (code) => process.exit(code ?? 0));
process.on("SIGINT", () => web.kill("SIGINT"));
process.on("SIGTERM", () => web.kill("SIGTERM"));
