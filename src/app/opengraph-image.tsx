import { ImageResponse } from "next/og";
import { getResume } from "@/lib/resume";

export const alt = "Andrew Lass — Portfolio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Satori (the engine behind next/og) only supports TTF / OTF / WOFF v1 —
// WOFF2 requires Brotli decompression that Satori does not bundle.
// Fetch via the Google Fonts CSS2 API: in a Node environment (non-browser UA)
// Google responds with a TTF src, not a woff2 one.
async function loadInterTtf(): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch("https://fonts.googleapis.com/css2?family=Inter:wght@400;700")
    ).text();
    // Extract the first truetype/opentype URL from the returned CSS
    const url = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/)?.[1];
    if (!url) return null;
    const res = await fetch(url);
    return res.ok ? res.arrayBuffer() : null;
  } catch {
    // Network unavailable at build time — Satori will use its built-in sans-serif
    return null;
  }
}

export default async function OgImage() {
  const resume = getResume();
  const fontData = await loadInterTtf();
  const topPillars = resume.pillars.slice(0, 4);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#070d14",
          padding: "64px 72px",
          fontFamily: fontData ? "Inter" : "sans-serif",
          position: "relative",
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "4px",
            background: "linear-gradient(90deg, #06b6d4, #0e7490)",
          }}
        />

        {/* Header: URL tag */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              color: "#06b6d4",
              fontSize: "18px",
              letterSpacing: "0.08em",
              fontWeight: 600,
            }}
          >
            andrewlass.com
          </div>
        </div>

        {/* Main content */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div
            style={{
              color: "#f1f5f9",
              fontSize: "72px",
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
            }}
          >
            {resume.name}
          </div>
          <div
            style={{
              color: "#94a3b8",
              fontSize: "28px",
              fontWeight: 400,
              lineHeight: 1.4,
              maxWidth: "860px",
            }}
          >
            {resume.headline}
          </div>
        </div>

        {/* Pillar tags */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {topPillars.map((p) => (
            <div
              key={p}
              style={{
                background: "rgba(6,182,212,0.12)",
                border: "1px solid rgba(6,182,212,0.3)",
                color: "#67e8f9",
                fontSize: "18px",
                padding: "8px 18px",
                borderRadius: "6px",
                fontWeight: 500,
                letterSpacing: "0.02em",
              }}
            >
              {p}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      ...(fontData
        ? {
            fonts: [
              {
                name: "Inter",
                data: fontData,
                style: "normal",
                weight: 400,
              },
            ],
          }
        : {}),
    }
  );
}
