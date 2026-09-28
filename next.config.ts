import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker needs standalone output; Vercel's adapter handles its own packaging.
  output: process.env.VERCEL === "1" ? undefined : "standalone",
  outputFileTracingIncludes: {
    "/demo": ["./src/demo/index.html"],
    "/demo/style.css": ["./src/demo/style.css"],
  },
};

export default nextConfig;
