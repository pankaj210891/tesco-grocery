import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import { siteConfig } from "@/config/site";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import ScrollRestorer from "@/components/layout/ScrollRestorer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
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
        <ThemeProvider>
          <ScrollRestorer />
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 2000,
              style: {
                borderRadius: "10px",
                fontFamily: "var(--font-sans)",
                fontSize: "14px",
                cursor: "pointer",
                paddingRight: "12px",
              },
              success: {
                iconTheme: { primary: "#0F4C75", secondary: "#fff" },
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
