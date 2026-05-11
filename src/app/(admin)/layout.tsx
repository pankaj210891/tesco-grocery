import type { Metadata } from "next";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AuthGuard from "@/components/auth/AuthGuard";

export const metadata: Metadata = { title: { template: "%s | Admin — Prakash", default: "Admin — Prakash" } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col lg:flex-row">
      <AdminSidebar />
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
        <AuthGuard roles={["admin"]}>{children}</AuthGuard>
      </main>
    </div>
  );
}
