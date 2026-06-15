import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['israeli-bank-scrapers', 'puppeteer', 'web-push'],
};

export default nextConfig;
