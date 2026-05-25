import type { NextConfig } from "next";

// ─── Content-Security-Policy ─────────────────────────────────────────────────
//
// Tuned for this stack:
//  • Next.js App Router — needs 'unsafe-inline' for Tailwind / inline styles.
//    Dev mode also needs 'unsafe-eval' for HMR hot reload; removed in production.
//  • Razorpay — checkout JS (checkout.razorpay.com) + API + telemetry + iframe
//  • Google Maps / Places autocomplete
//  • Cloudinary, Unsplash, Loremflickr for product images
//
function buildCsp(isProd: boolean): string {
  const scriptSrc = [
    "'self'",
    // Razorpay checkout script
    "https://checkout.razorpay.com",
    // Google Maps Places API
    "https://maps.googleapis.com",
    // Next.js App Router injects inline scripts — needed until nonce-based CSP is wired up
    "'unsafe-inline'",
    // HMR and React DevTools require eval in development only
    ...(!isProd ? ["'unsafe-eval'"] : []),
  ].join(" ");

  const directives: Record<string, string> = {
    "default-src":  "'self'",
    "script-src":   scriptSrc,
    // Tailwind uses inline styles extensively; 'unsafe-inline' is required
    "style-src":    "'self' 'unsafe-inline'",
    // Product images from external CDNs; data: for base64 thumbnails
    "img-src":      "'self' data: blob: https://images.unsplash.com https://res.cloudinary.com https://loremflickr.com",
    "font-src":     "'self' data:",
    // XHR/fetch targets: own API + Razorpay API + telemetry
    "connect-src":  "'self' https://api.razorpay.com https://lumberjack.razorpay.com",
    // Razorpay payment iframe
    "frame-src":    "'self' https://api.razorpay.com",
    // Block all plugin content (Flash etc.)
    "object-src":   "'none'",
    // Prevent base-tag hijacking
    "base-uri":     "'self'",
    // Only allow form submission to same origin
    "form-action":  "'self'",
    // Upgrade plain-http sub-resource requests to https in production
    ...(isProd ? { "upgrade-insecure-requests": "" } : {}),
  };

  return Object.entries(directives)
    .map(([k, v]) => (v ? `${k} ${v}` : k))
    .join("; ");
}

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  /* ── Security ─────────────────────────────────────────────────── */
  poweredByHeader: false,

  /* ── Server externals ─────────────────────────────────────────── */
  serverExternalPackages: ["mongoose", "pino"],

  /* ── Compiler ─────────────────────────────────────────────────── */
  compiler: {
    // Strip console.* calls in production builds only
    removeConsole: isProd ? { exclude: ["error", "warn"] } : false,
  },

  /* ── Experimental ─────────────────────────────────────────────── */
  experimental: {
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
          // Content-Security-Policy — primary XSS defence
          { key: "Content-Security-Policy",   value: buildCsp(isProd) },
          // Prevent MIME-type sniffing
          { key: "X-Content-Type-Options",    value: "nosniff" },
          // Block framing by other origins
          { key: "X-Frame-Options",           value: "DENY" },
          // Legacy XSS filter (IE/old browsers)
          { key: "X-XSS-Protection",          value: "1; mode=block" },
          // Control referrer information sent to external sites
          { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
          // Disable sensitive browser APIs we don't use
          { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },

  /* ── Dev ──────────────────────────────────────────────────────── */
  allowedDevOrigins: ["172.20.10.10"],
};

export default nextConfig;
