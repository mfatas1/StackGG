import pg from "pg";
import { databaseUrl } from "./env.js";

const { Pool } = pg;

/**
 * Shared Postgres pool. One pool per process; reused across requests.
 * pg returns bigint/numeric as strings by default — we cast in SQL where needed.
 */
let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new Pool({ connectionString: databaseUrl(), max: 10 });
    pool.on("error", (err) => {
      console.error("[db] idle client error", err.message);
    });
  }
  return pool;
}

export type Queryable = Pick<pg.Pool, "query"> | Pick<pg.PoolClient, "query">;

/** Convenience: run a query against the shared pool (or a provided client/tx). */
export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params: unknown[] = [],
  client: Queryable = getPool(),
): Promise<T[]> {
  const res = await client.query<T>(text, params as never[]);
  return res.rows;
}

export async function queryOne<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params: unknown[] = [],
  client: Queryable = getPool(),
): Promise<T | null> {
  const rows = await query<T>(text, params, client);
  return rows[0] ?? null;
}

/** Run fn inside a transaction with a dedicated client. */
export async function withTransaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
