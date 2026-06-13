import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getPool, queryOne, env, generateToken } from "@crewstats/shared";
import type { UserRow } from "@crewstats/shared";

const COOKIE = "cs_session";
const SESSION_TTL_DAYS = 30;
const MAGIC_TTL_MIN = 30;

function secret(): string {
  return env().AUTH_SECRET;
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function verify(value: string, sig: string): boolean {
  const expected = sign(value);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// ---- Magic links ----

export async function createMagicLink(email: string, redirectTo = "/"): Promise<string> {
  const token = generateToken(32);
  await getPool().query(
    `INSERT INTO magic_links (token, email, redirect_to, expires_at)
     VALUES ($1, $2, $3, now() + ($4 || ' minutes')::interval)`,
    [token, email.toLowerCase(), redirectTo, String(MAGIC_TTL_MIN)],
  );
  const base = env().NEXT_PUBLIC_BASE_URL;
  return `${base}/api/auth/callback?token=${token}`;
}

/** "Send" a magic link. v1 transport is console (no SMTP configured). */
export async function deliverMagicLink(email: string, url: string): Promise<void> {
  if (env().MAGIC_LINK_TRANSPORT === "console") {
    console.log(`\n🔗 Magic link for ${email}:\n   ${url}\n`);
  }
  // SMTP transport intentionally unimplemented in v1 (see PLAN §5.3 / README).
}

export async function consumeMagicLink(
  token: string,
): Promise<{ user: UserRow; sessionId: string; redirectTo: string } | null> {
  const link = await queryOne<{ email: string; redirect_to: string | null }>(
    `UPDATE magic_links SET consumed_at = now()
     WHERE token = $1 AND consumed_at IS NULL AND expires_at > now()
     RETURNING email, redirect_to`,
    [token],
  );
  if (!link) return null;

  const user = await queryOne<UserRow>(
    `INSERT INTO users (email) VALUES ($1)
     ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
     RETURNING *`,
    [link.email],
  );
  if (!user) return null;

  const sessionId = generateToken(32);
  await getPool().query(
    `INSERT INTO sessions (id, user_id, expires_at)
     VALUES ($1, $2, now() + ($3 || ' days')::interval)`,
    [sessionId, user.id, String(SESSION_TTL_DAYS)],
  );
  return { user, sessionId, redirectTo: link.redirect_to ?? "/" };
}

// ---- Cookie session ----

export async function setSessionCookie(sessionId: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, `${sessionId}.${sign(sessionId)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: env().NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 86400,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getCurrentUser(): Promise<UserRow | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot < 0) return null;
  const sessionId = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!verify(sessionId, sig)) return null;

  return queryOne<UserRow>(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.id = $1 AND s.expires_at > now()`,
    [sessionId],
  );
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (raw) {
    const sessionId = raw.slice(0, raw.lastIndexOf("."));
    if (sessionId) await getPool().query(`DELETE FROM sessions WHERE id = $1`, [sessionId]);
  }
  await clearSessionCookie();
}
