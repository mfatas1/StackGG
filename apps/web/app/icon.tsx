import { ImageResponse } from "next/og";

// Browser-tab / search-result favicon: the StackGG "S" mark from the header.
// Reproduces the header's chamfered "notch" box (clip-path polygon — top-left
// and bottom-right corners cut) in brand teal, with a near-white serif "S".
// 48px square so Google Search accepts it (it wants a multiple of 48px).
export const size = { width: 48, height: 48 };
export const contentType = "image/png";

// notch-sm ratio from globals.css: 8px notch on a 28px box ≈ 0.286 of the side.
const N = 48 * (8 / 28);
const points = [
  [N, 0],
  [48, 0],
  [48, 48 - N],
  [48 - N, 48],
  [0, 48],
  [0, N],
]
  .map((p) => p.join(","))
  .join(" ");

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ position: "relative", width: "100%", height: "100%", display: "flex" }}>
        <svg width="48" height="48" viewBox="0 0 48 48" style={{ position: "absolute", top: 0, left: 0 }}>
          <polygon points={points} fill="#008388" />
        </svg>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#f8fdfd",
            fontSize: 30,
            fontWeight: 800,
            fontFamily: "serif",
            lineHeight: 1,
          }}
        >
          S
        </div>
      </div>
    ),
    { ...size },
  );
}
