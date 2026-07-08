import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Shown when a StackGG link is shared (LinkedIn, Discord, X, iMessage, search previews).
// Product-forward card: the real parchment theme, the Cinzel/Hanken type, and an actual
// leaderboard shot — so the preview reads like the site, not an abstract placeholder.
export const alt = "StackGG — group-first League of Legends stats";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Parchment (default) theme, approximated in sRGB for Satori.
const CREAM = "#efe7d5";
const CREAM_2 = "#e4d9be";
const INK = "#211f19";
const MUTED = "#6c6553";
const TEAL = "#1f7a86";
const GOLD = "#b8892f";

// next/og's FontOptions.weight is a fixed union, not `number`.
type Weight = 400 | 500 | 600 | 700 | 800;
type Font = { name: string; data: ArrayBuffer; weight: Weight; style: "normal" };

// Fetch a Google font the site uses (Cinzel display, Hanken Grotesk sans) as a static TTF
// for Satori. The full font is loaded (NOT the &text= subset) — subset fonts get their glyph
// IDs remapped and Satori then renders the wrong glyphs. Wrapped so a font-CDN hiccup degrades
// gracefully (serif/sans fallback) instead of failing the whole image.
async function loadFont(family: string, weight: Weight): Promise<Font[]> {
  try {
    const url = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}`;
    // A UA without woff2 support makes Google serve a parseable TTF (Satori can't read woff2).
    const css = await (await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 6.1)" } })).text();
    const src = css.match(/src:\s*url\((.+?)\)\s*format\(['"]?(?:opentype|truetype)['"]?\)/);
    if (!src) return [];
    const data = await (await fetch(src[1])).arrayBuffer();
    return [{ name: family, data, weight, style: "normal" }];
  } catch {
    return [];
  }
}

export default async function OgImage() {
  const board = await readFile(join(process.cwd(), "public/og/board.png"));
  const boardSrc = `data:image/png;base64,${board.toString("base64")}`;

  // Cinzel renders lowercase as small caps (a jarring two-height look at display size), so —
  // like the site's own display headings — the headline is set in full uppercase.
  const headline = "YOUR SQUAD'S LEAGUE, ON ONE PAGE.";
  const sub = "Cross-mode leaderboards, duo synergy, records & playstyle tags — for your whole League group, not just you.";

  const [cinzel700, hanken500, hanken600] = await Promise.all([
    loadFont("Cinzel", 700),
    loadFont("Hanken Grotesk", 500),
    loadFont("Hanken Grotesk", 600),
  ]);
  const fonts = [...cinzel700, ...hanken500, ...hanken600];
  const serif = cinzel700.length ? "Cinzel" : "Georgia, serif";
  const sans = hanken500.length ? "Hanken Grotesk" : "Helvetica, Arial, sans-serif";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: `linear-gradient(135deg, ${CREAM} 0%, ${CREAM_2} 100%)`,
          color: INK,
          fontFamily: sans,
        }}
      >
        {/* Rift-light diagonals — the faint streaks the real background carries */}
        <div style={{ position: "absolute", top: -120, left: -80, width: 900, height: 260, background: "rgba(255,255,255,0.35)", transform: "rotate(-24deg)", display: "flex" }} />
        <div style={{ position: "absolute", bottom: -160, left: 120, width: 1100, height: 220, background: "rgba(31,122,134,0.10)", transform: "rotate(-24deg)", display: "flex" }} />

        {/* Left: brand + value prop */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: 470, padding: "0 0 0 72px", zIndex: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 52, height: 52, borderRadius: 14, background: TEAL, color: CREAM, fontFamily: serif, fontSize: 30, fontWeight: 700 }}>S</div>
            <div style={{ display: "flex", fontFamily: serif, fontSize: 34, fontWeight: 700, letterSpacing: 1 }}>
              <span>Stack</span>
              <span style={{ color: TEAL }}>GG</span>
            </div>
          </div>

          <div style={{ display: "flex", fontFamily: serif, fontSize: 48, fontWeight: 700, letterSpacing: 1.5, lineHeight: 1.12, marginTop: 30, maxWidth: 350 }}>{headline}</div>

          <div style={{ display: "flex", fontFamily: sans, fontSize: 23, color: MUTED, lineHeight: 1.4, marginTop: 24, maxWidth: 330 }}>{sub}</div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 38 }}>
            <div style={{ display: "flex", width: 8, height: 8, borderRadius: 8, background: GOLD }} />
            <div style={{ display: "flex", fontFamily: sans, fontSize: 24, fontWeight: 600, color: TEAL, letterSpacing: 0.5 }}>stackgg.app</div>
          </div>
        </div>

        {/* Right: the actual product, framed like a browser and bled off the edge */}
        <div style={{ position: "absolute", right: -70, top: 108, width: 700, display: "flex", flexDirection: "column", borderRadius: 16, overflow: "hidden", border: "1px solid rgba(33,31,25,0.14)", boxShadow: "0 40px 90px rgba(33,31,25,0.28)", background: "#fff" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, height: 34, padding: "0 14px", background: CREAM_2, borderBottom: "1px solid rgba(33,31,25,0.10)" }}>
            <div style={{ display: "flex", width: 11, height: 11, borderRadius: 11, background: "#d98b7a" }} />
            <div style={{ display: "flex", width: 11, height: 11, borderRadius: 11, background: "#e0c26b" }} />
            <div style={{ display: "flex", width: 11, height: 11, borderRadius: 11, background: "#8bbf9f" }} />
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={boardSrc} width={700} alt="StackGG stack leaderboard" style={{ display: "flex" }} />
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length ? fonts : undefined },
  );
}
