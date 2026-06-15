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

function magicEmailHtml(url: string): string {
  return `<!doctype html><html><body style="margin:0;background:#0e1116;font-family:ui-sans-serif,system-ui,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:440px;background:#161b22;border:1px solid #2a313c;border-radius:10px;padding:32px">
        <tr><td>
          <div style="font-size:20px;font-weight:700;color:#e8c87a;letter-spacing:.5px">StackGG</div>
          <p style="color:#c8cfd8;font-size:15px;line-height:1.5;margin:20px 0 8px">Click below to sign in. This link expires in ${MAGIC_TTL_MIN} minutes.</p>
          <p style="margin:24px 0">
            <a href="${url}" style="display:inline-block;background:#3b82f6;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:8px">Sign in to StackGG</a>
          </p>
          <p style="color:#7c8794;font-size:12px;line-height:1.5;margin:16px 0 0">If the button doesn't work, paste this into your browser:<br><span style="color:#9aa6b2;word-break:break-all">${url}</span></p>
          <p style="color:#5a636e;font-size:12px;margin:20px 0 0">If you didn't request this, you can safely ignore it.</p>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

/** Send a magic link. Uses Resend (HTTP API) when configured; otherwise logs to console (dev). */
export async function deliverMagicLink(email: string, url: string): Promise<void> {
  const e = env();
  if (e.MAGIC_LINK_TRANSPORT === "resend" && e.RESEND_API_KEY) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${e.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: e.MAGIC_LINK_FROM,
        to: [email],
        subject: "Your StackGG sign-in link",
        html: magicEmailHtml(url),
        text: `Sign in to StackGG:\n${url}\n\nThis link expires in ${MAGIC_TTL_MIN} minutes. If you didn't request it, ignore this email.`,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Email send failed (${res.status}): ${body.slice(0, 200)}`);
    }
    return;
  }
  // Fallback: console transport (dev, or when Resend isn't configured yet).
  console.log(`\n🔗 Magic link for ${email}:\n   ${url}\n`);
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
    // Secure only when actually served over HTTPS. Basing this on NODE_ENV broke
    // login under `next start` on http://localhost (browsers drop Secure cookies
    // over plain http), even though curl ignored the rule.
    secure: env().NEXT_PUBLIC_BASE_URL.startsWith("https"),
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
