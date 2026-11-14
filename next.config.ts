import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js already allows localhost; Docker binds to 0.0.0.0, not browser loopback.
  // This setting applies only to development resources, including HMR.
  allowedDevOrigins: ["127.0.0.1"],
  // Docker needs standalone output; Vercel's adapter handles its own packaging.
  output: process.env.VERCEL === "1" ? undefined : "standalone",
  outputFileTracingIncludes: {
    "/demo": ["./src/demo/index.html"],
    "/demo/style.css": ["./src/demo/style.css"],
    "/demo/demo.js": ["./src/demo/demo.js"],
  },
};

export default nextConfig;
