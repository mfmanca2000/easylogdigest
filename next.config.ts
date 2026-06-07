import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["node-cron", "nodemailer", "@react-pdf/renderer", "bcryptjs"],
};

export default nextConfig;
