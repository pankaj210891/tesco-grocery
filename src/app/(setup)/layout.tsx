import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Setup — Prakash Supermarket",
  description: "Install and configure your Prakash Supermarket instance.",
};

export default function SetupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F4C75] via-[#0a3352] to-[#06233a] flex items-center justify-center p-4">
      {children}
    </div>
  );
}
