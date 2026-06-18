import { ImageResponse } from "next/og";

// Apple touch icon (home-screen / bookmark): same StackGG "S" mark, larger.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#008388",
          borderRadius: 40,
          color: "#f8fdfd",
          fontSize: 132,
          fontWeight: 800,
          fontFamily: "serif",
          lineHeight: 1,
        }}
      >
        S
      </div>
    ),
    { ...size },
  );
}
