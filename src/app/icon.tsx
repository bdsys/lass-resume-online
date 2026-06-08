import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Terminal prompt icon — >_ in site accent cyan on dark background.
// No external font fetch; Satori's built-in font handles these ASCII characters fine.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: "#070d14",
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#06b6d4",
            letterSpacing: -1,
            lineHeight: 1,
          }}
        >
          {">_"}
        </span>
      </div>
    ),
    { width: 32, height: 32 }
  );
}
