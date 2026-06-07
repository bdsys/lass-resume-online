import type { NextConfig } from "next";

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
