import { withBotId } from "botid/next/config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // BotID guards the decision endpoint where it can actually run: on Vercel. A local server has no
    // challenge service to talk to (and the server-side check is skipped there too).
    JEV_BOTID: process.env.VERCEL ? "on" : "off",
  },
  // The energy demo used to live at the root: keep old links and shared searches working.
  async redirects() {
    return [
      { source: "/", has: [{ type: "query", key: "q" }], destination: "/energy", permanent: false },
      { source: "/frontends", destination: "/energy/frontends", permanent: false },
    ];
  },
  // Baseline hardening for a public demo; Vercel adds HSTS itself.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

// BotID's challenge script and proxy are served from this app's own origin.
export default withBotId(nextConfig);
