import type { Metadata } from "next";
import VendorSidebar from "@/components/vendor/VendorSidebar";

export const metadata: Metadata = { title: { template: "%s | Vendor — Prakash", default: "Vendor Portal — Prakash" } };

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col lg:flex-row">
      <VendorSidebar />
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
