import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ffmpeg-static ships a native binary and resolves its path via __dirname.
  // Turbopack rewrites that to a /ROOT/... placeholder unless we keep the
  // package external in the server bundle.
  serverExternalPackages: ["ffmpeg-static"],
};

export default nextConfig;
