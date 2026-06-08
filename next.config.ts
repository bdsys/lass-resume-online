import type { NextConfig } from "next";

// React dev mode uses eval() for callstack reconstruction / source-map debugging.
// Production never does, so 'unsafe-eval' is dev-only — the deployed Worker keeps
// a strict script-src.
const isDev = process.env.NODE_ENV !== "production";

// ── Security headers ──────────────────────────────────────────────────────────
// Applied to every route (/:path*). CSP covers known external origins:
//   - static.cloudflareinsights.com  → cookieless Web Analytics beacon (layout.tsx)
//   - avatars.githubusercontent.com  → GitHub avatar image (homepage)
//   - fonts.googleapis.com / fonts.gstatic.com → Geist font (next/font/google)
const SECURITY_HEADERS = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Scripts: self + inline (Next.js uses inline script for hydration) + CF analytics.
      // 'unsafe-eval' added in dev only — React uses eval() for debugging features.
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://static.cloudflareinsights.com`,
      // Styles: self + inline (Tailwind/Next injects inline styles) + Google Fonts
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Fonts
      "font-src 'self' https://fonts.gstatic.com",
      // Images: self + data URIs + GitHub avatars
      "img-src 'self' data: https://avatars.githubusercontent.com",
      // Connections: self + WAF demo (browser-side fetch in WafDemo.tsx) + CF analytics
      "connect-src 'self' https://waf-demo.andrewlass.com https://static.cloudflareinsights.com",
      // No iframes, objects, or media
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
    ].join("; "),
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
];

const nextConfig: NextConfig = {
  images: {
    // Allow GitHub avatar images
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        pathname: "/**",
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },

  async rewrites() {
    // ip.andrewlass.com → /api/ip for every path.
    // The custom domain is attached to the same Cloudflare Worker in wrangler.toml.
    // Request headers (including CF-Connecting-IP) survive the internal rewrite.
    //
    // Must be in beforeFiles so it intercepts requests for paths that would
    // otherwise match existing filesystem routes (/, /portfolio, etc.).
    return {
      beforeFiles: [
        {
          source: "/:path*",
          has: [{ type: "host", value: "ip.andrewlass.com" }],
          destination: "/api/ip",
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
