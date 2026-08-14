import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.117"],
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:4000/api/:path*",
      },
      {
        source: "/uploads/:path*",
        destination: "http://localhost:4000/uploads/:path*",
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/dashboard/requests/history",
        destination: "/dashboard/my-requests",
        permanent: true,
      },
      {
        source: "/dashboard/requests",
        destination: "/book",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
