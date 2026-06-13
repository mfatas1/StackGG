import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Load the monorepo-root .env so RIOT_KEY / DATABASE_URL are available to the
// Next server without duplicating the file.
const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, "../../.env") });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@crewstats/shared", "@crewstats/stats"],
  serverExternalPackages: ["pg", "pg-boss"],
  env: {
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000",
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "ddragon.leagueoflegends.com" }],
  },
  webpack: (config) => {
    // Resolve ESM-style ".js" import specifiers in our TS workspace packages.
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
};

export default nextConfig;
