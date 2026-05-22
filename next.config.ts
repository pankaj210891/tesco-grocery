import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* ── Security ─────────────────────────────────────────────────── */
  poweredByHeader: false,

  /* ── Server externals ─────────────────────────────────────────── */
  serverExternalPackages: ["mongoose"],

  /* ── Compiler ─────────────────────────────────────────────────── */
  compiler: {
    // Strip console.* calls in production builds only
    removeConsole: process.env.NODE_ENV === "production"
      ? { exclude: ["error", "warn"] }
      : false,
  },

  /* ── Experimental ─────────────────────────────────────────────── */
  experimental: {
    /*
     * Instructs the Next.js bundler to apply tree-shaking at the
     * sub-module level for these packages, preventing barrel-file
     * bloat.  lucide-react ships ~1 400 icons — without this, every
     * icon lands in the bundle even if only 5 are used.
     */
    optimizePackageImports: [
      "lucide-react",
      "sonner",
      "clsx",
      "tailwind-merge",
      "@hookform/resolvers",
    ],
  },

  /* ── Images ───────────────────────────────────────────────────── */
  images: {
    // Prefer AVIF (smaller), fall back to WebP
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "loremflickr.com" },
    ],
  },

  /* ── Security headers ─────────────────────────────────────────── */
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options",    value: "nosniff" },
          { key: "X-Frame-Options",           value: "DENY" },
          { key: "X-XSS-Protection",          value: "1; mode=block" },
          { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },

  /* ── Dev ──────────────────────────────────────────────────────── */
  allowedDevOrigins: ["172.20.10.10"],
};

export default nextConfig;
