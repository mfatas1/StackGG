import { ImageResponse } from "next/og";

// Browser-tab / search-result favicon: the StackGG "S" mark from the header.
// Static teal brand box (parchment theme --primary) with a near-white "S".
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 7,
          color: "#f8fdfd",
          fontSize: 24,
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
