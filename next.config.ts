import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: ['strum-cartoon-versus.ngrok-free.dev'],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
};

export default nextConfig;
