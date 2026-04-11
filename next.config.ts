import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Allow preview panel cross-origin requests
  allowedDevOrigins: [
    "https://*.space.z.ai",
    "http://*.space.z.ai",
  ],
};

export default nextConfig;
