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
};

export default nextConfig;
