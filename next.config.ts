import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/demo": ["./src/demo/index.html"],
    "/demo/style.css": ["./src/demo/style.css"],
  },
};

export default nextConfig;
