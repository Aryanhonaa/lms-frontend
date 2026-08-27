import type { NextConfig } from "next";

const extraOrigins = (process.env.ALLOWED_DEV_ORIGINS ?? "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

function apiProxyOrigin(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1").trim();
  return raw.replace(/\/api\/v1\/?$/, "").replace(/\/$/, "") || "http://localhost:5000";
}

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiProxyOrigin()}/api/v1/:path*`,
      },
    ];
  },
  allowedDevOrigins: [
    "10.110.110.75",
    "10.*.*.*",
    "192.168.*.*",
    "172.16.*.*",
    "172.17.*.*",
    "172.18.*.*",
    "172.19.*.*",
    "172.20.*.*",
    "172.21.*.*",
    "172.22.*.*",
    "172.23.*.*",
    "172.24.*.*",
    "172.25.*.*",
    "172.26.*.*",
    "172.27.*.*",
    "172.28.*.*",
    "172.29.*.*",
    "172.30.*.*",
    "172.31.*.*",
    ...extraOrigins,
  ],
};

export default nextConfig;
