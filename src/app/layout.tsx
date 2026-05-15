import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { siteConfig } from "@/config/site";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import ScrollRestorer from "@/components/layout/ScrollRestorer";
import NetworkStatus from "@/components/layout/NetworkStatus";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default:  `${siteConfig.name} — ${siteConfig.tagline}`,
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
      {/*
       * Blocking script — runs synchronously before first paint.
       * 1. Adds `no-transitions` so the CSS transition on <body> cannot animate
       *    a brief wrong-theme state between server HTML and React hydration.
       *    ThemeProvider removes this class after the first animation frame.
       * 2. Reads the stored theme from localStorage and applies the "dark" class
       *    immediately so there is no flash of wrong theme on hard reload.
       * Logic mirrors ThemeProvider: "dark" → dark | "light" → light | else → OS pref.
       */}
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{document.documentElement.classList.add('no-transitions');var t=localStorage.getItem('prakash-theme'),p=window.matchMedia('(prefers-color-scheme:dark)').matches;document.documentElement.classList.toggle('dark',t==='dark'||(t!=='light'&&p))}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <ScrollRestorer />
          <NetworkStatus />
          {children}
          <Toaster position="top-right" richColors duration={2000} />
        </ThemeProvider>
      </body>
    </html>
  );
}
