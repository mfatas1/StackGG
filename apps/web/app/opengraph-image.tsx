import { ImageResponse } from "next/og";

// Shown when a StackGG link is shared (Discord, X, iMessage, search previews).
export const alt = "StackGG: your whole squad's League, on one page";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "radial-gradient(120% 120% at 0% 0%, #16213e 0%, #0b1020 55%, #070a14 100%)",
          color: "#f3e6c8",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 34, color: "#d6b25a", letterSpacing: 2 }}>
          ⚔ STACKGG
        </div>
        <div style={{ display: "flex", fontSize: 84, fontWeight: 800, marginTop: 24, lineHeight: 1.05 }}>
          Your whole squad&apos;s League. On one page.
        </div>
        <div style={{ display: "flex", fontSize: 34, marginTop: 28, color: "#c9bfa6", maxWidth: 900, lineHeight: 1.3 }}>
          op.gg is about you. StackGG is about the group.
        </div>
        <div style={{ display: "flex", marginTop: 44, fontSize: 28, color: "#8a93a8" }}>stackgg.app</div>
      </div>
    ),
    { ...size },
  );
}
