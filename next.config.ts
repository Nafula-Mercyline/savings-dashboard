
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const backend =
      process.env.BACKEND_URL ||
      (process.env.NODE_ENV === "production"
        ? "https://savings-backend-b4l7.onrender.com"
        : "http://localhost:5000");

    return [
      {
        source: "/api/:path*",
        destination: `${backend}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;