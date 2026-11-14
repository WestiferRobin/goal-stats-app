import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The local Docker port is published only on loopback.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // Docker needs standalone output; Vercel's adapter handles its own packaging.
  output: process.env.VERCEL === "1" ? undefined : "standalone",
  outputFileTracingIncludes: {
    "/demo": ["./src/demo/index.html"],
    "/demo/style.css": ["./src/demo/style.css"],
    "/demo/demo.js": ["./src/demo/demo.js"],
  },
};

export default nextConfig;
