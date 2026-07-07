import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [
      {
        source: "/dashboard/requests/history",
        destination: "/dashboard/my-requests",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
