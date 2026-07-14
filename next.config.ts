import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Next.js dev tools indicator (bottom-left by default) sits directly over
  // the chat input, which lives flush to the bottom-left of the viewport on
  // mobile — it was mistaken for an app bug during QA. Dev-mode only, no
  // effect on production, but disabling it avoids the false positive.
  devIndicators: false,
};

export default nextConfig;
