import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { Toaster } from "sonner";
import "./globals.css";
import { siteConfig } from "@/config/site";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import ScrollRestorer from "@/components/layout/ScrollRestorer";
import NetworkStatus from "@/components/layout/NetworkStatus";
import QuickNav from "@/components/ui/QuickNav";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: siteConfig.url,
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    /*
     * suppressHydrationWarning prevents the mismatch warning caused by
     * ThemeProvider toggling the "dark" class on <html> during hydration.
     */
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body>
        {/*
         * Blocking theme-init script injected by Next.js into <head> via
         * strategy="beforeInteractive".  Next.js owns the injection on both
         * server and client, so React never sees a node-position mismatch.
         *
         * Reads localStorage and applies the "dark" class before first paint:
         *   "dark"            → dark
         *   "light"           → light
         *   "system" / unset  → follow OS preference
         */}
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('prakash-theme'),p=window.matchMedia('(prefers-color-scheme:dark)').matches;document.documentElement.classList.toggle('dark',t==='dark'||(t!=='light'&&p))}catch(e){}})()`,
          }}
        />
        <ThemeProvider>
          <ScrollRestorer />
          <NetworkStatus />
          {children}
          <QuickNav />
          <Toaster position="top-right" richColors duration={2000} />
        </ThemeProvider>
      </body>
    </html>
  );
}
