import { ImageResponse } from "next/og";
import { getPool } from "@crewstats/shared";
import { getCrewMemberPuuids } from "@crewstats/stats";
import { getCrewBySlug } from "@/lib/crews";
import { getStackRecap } from "@/lib/recap/resolve";
import { champIcon } from "@/lib/format";
import { resolveTheme, toneHex } from "@/lib/recap/og-theme";
import type { RecapWindow } from "@/lib/recap/types";

export const runtime = "nodejs";
const size = { width: 1200, height: 630 };

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const url = new URL(req.url);
  const window: RecapWindow = url.searchParams.get("window") === "week" ? "week" : "season";
  const theme = resolveTheme(url.searchParams.get("theme"));

  const crew = await getCrewBySlug(slug);
  if (!crew) return new Response("Not found", { status: 404 });
  const puuids = await getCrewMemberPuuids(getPool(), crew.id);
  const recap = await getStackRecap(crew.name, crew.slug, puuids, window);

  const top = recap.roster.slice(0, 3);
  const hours = Math.round(recap.grind.hours).toLocaleString();
  const metrics = [
    { v: recap.grind.stackGames.toLocaleString(), l: "GAMES" },
    { v: `${hours}h`, l: "ON THE RIFT" },
    { v: String(recap.pentakills?.total ?? 0), l: "PENTAKILLS" },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: 56,
          background: theme.bg,
          color: theme.ink,
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(60% 60% at 90% 0%, ${theme.primary}33, transparent 70%)`, display: "flex" }} />
        {/* header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", color: theme.gold, fontSize: 24, letterSpacing: 6, fontWeight: 700 }}>
            {recap.meta.windowLabel.toUpperCase()} RECAP
          </div>
          <div style={{ display: "flex", color: theme.inkFaint, fontSize: 22, letterSpacing: 3 }}>STACKGG.APP</div>
        </div>

        {/* stack name + identity */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: 20 }}>
          <div style={{ display: "flex", fontSize: 72, fontWeight: 800, lineHeight: 1, textTransform: "uppercase" }}>{recap.meta.stackName}</div>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 800, color: theme.gold, marginTop: 10 }}>{recap.identity.name}</div>
          <div style={{ display: "flex", fontSize: 23, color: theme.inkDim, marginTop: 8, maxWidth: 1040, lineHeight: 1.25 }}>{recap.identity.blurb}</div>
        </div>

        {/* metrics */}
        <div style={{ display: "flex", gap: 52, marginTop: 22, borderTop: `2px solid ${theme.line}`, borderBottom: `2px solid ${theme.line}`, padding: "16px 0" }}>
          {metrics.map((m) => (
            <div key={m.l} style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 42, fontWeight: 800 }}>{m.v}</div>
              <div style={{ display: "flex", fontSize: 18, color: theme.inkFaint, letterSpacing: 2 }}>{m.l}</div>
            </div>
          ))}
        </div>

        {/* top archetypes */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 18 }}>
          {top.map((c) => (
            <div key={c.puuid} style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {c.champion ? (
                <img src={champIcon(c.champion)} width={44} height={44} style={{ borderRadius: 999, border: `2px solid ${toneHex(c.tone, theme)}` }} />
              ) : (
                <div style={{ display: "flex", width: 44, height: 44, borderRadius: 999, background: theme.surface }} />
              )}
              <div style={{ display: "flex", flex: 1, fontSize: 25, color: theme.inkDim }}>{c.name}</div>
              <div style={{ display: "flex", fontSize: 25, fontWeight: 700, color: toneHex(c.tone, theme) }}>{c.title}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", marginTop: 20, fontSize: 21, color: theme.inkFaint }}>Make your group&apos;s recap → stackgg.app</div>
      </div>
    ),
    { ...size },
  );
}
