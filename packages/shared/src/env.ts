import { z } from "zod";

/**
 * Environment access. Validated lazily so that importing this module in a context
 * that only needs a subset (e.g. the web app, which never needs RIOT_KEY directly
 * because ingestion is centralized) does not hard-fail.
 *
 * SECURITY (PLAN hard rule #1): RIOT_KEY is read here and nowhere else outside the
 * RiotClient. It is never logged.
 */
const schema = z.object({
  RIOT_KEY: z.string().min(1).optional(),
  DATABASE_URL: z.string().min(1),
  DATABASE_URL_TEST: z.string().optional(),
  DEFAULT_PLATFORM: z.string().default("euw1"),
  AUTH_SECRET: z.string().min(1).default("dev-secret-change-me-in-production"),
  NEXT_PUBLIC_BASE_URL: z.string().default("http://localhost:3000"),
  MAGIC_LINK_TRANSPORT: z.enum(["console", "smtp"]).default("console"),
  NODE_ENV: z.string().default("development"),
});

let cached: z.infer<typeof schema> | null = null;

export function env(): z.infer<typeof schema> {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  }
  cached = parsed.data;
  return cached;
}

/** Returns the active database URL, honoring a test override when running under vitest. */
export function databaseUrl(): string {
  const e = env();
  const isTest = process.env.VITEST || process.env.NODE_ENV === "test";
  if (isTest && e.DATABASE_URL_TEST) return e.DATABASE_URL_TEST;
  return e.DATABASE_URL;
}

export function riotKey(): string {
  const key = env().RIOT_KEY;
  if (!key) throw new Error("RIOT_KEY is not set; required for Riot API access.");
  return key;
}
