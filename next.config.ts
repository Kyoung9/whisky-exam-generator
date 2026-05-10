import type { NextConfig } from "next";

// 注意: @react-pdf/renderer はサーバーバンドルから除外する
const nextConfig: NextConfig = {
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
