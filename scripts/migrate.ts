/**
 * Migration runner. Applies migrations/*.sql in lexical order, tracking applied
 * files in a _migrations table. Idempotent.
 *
 *   tsx scripts/migrate.ts            # migrate DATABASE_URL
 *   tsx scripts/migrate.ts --reset    # DROP all objects then re-migrate
 *   tsx scripts/migrate.ts --test     # operate on DATABASE_URL_TEST
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { Client } from "pg";

config({ path: join(dirname(fileURLToPath(import.meta.url)), "..", ".env") });

const useTest = process.argv.includes("--test");
const reset = process.argv.includes("--reset");
const connectionString = useTest ? process.env.DATABASE_URL_TEST : process.env.DATABASE_URL;

if (!connectionString) {
  console.error(`Missing ${useTest ? "DATABASE_URL_TEST" : "DATABASE_URL"} in .env`);
  process.exit(1);
}

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");

async function main() {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    if (reset) {
      console.log("Resetting public schema...");
      await client.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
    }
    await client.query(`CREATE TABLE IF NOT EXISTS _migrations (
      name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);

    const applied = new Set(
      (await client.query<{ name: string }>("SELECT name FROM _migrations")).rows.map((r) => r.name),
    );
    const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`  skip   ${file}`);
        continue;
      }
      const sql = readFileSync(join(migrationsDir, file), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO _migrations(name) VALUES ($1)", [file]);
        await client.query("COMMIT");
        console.log(`  applied ${file}`);
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }
    console.log(`Migrations complete on ${useTest ? "TEST" : "dev"} database.`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
