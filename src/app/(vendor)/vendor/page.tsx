"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Package, ShoppingBag, CheckCircle, XCircle } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import StatsCard from "@/components/admin/StatsCard";
import type { Vendor } from "@/types";

interface VendorStats { totalProducts: number; inStockProducts: number; outOfStockProducts: number; totalOrders: number; }

export default function VendorDashboard() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  const [stats, setStats]   = useState<VendorStats | null>(null);
  const [profile, setProfile] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    if (user.role !== "vendor" && user.role !== "admin") { router.push("/"); return; }

    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch("/api/vendor/stats", { headers }).then((r) => r.json() as Promise<{ success: boolean; data: VendorStats }>),
      fetch("/api/vendor/profile", { headers }).then((r) => r.json() as Promise<{ success: boolean; data: Vendor }>),
    ]).then(([statsRes, profileRes]) => {
      if (statsRes.success)   setStats(statsRes.data);
      if (profileRes.success) setProfile(profileRes.data);
    }).finally(() => setLoading(false));
  }, [user, token, router]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Vendor Dashboard</h1>
        {profile && <p className="text-sm text-gray-500 mt-0.5">{profile.name} · <span className={`font-semibold ${profile.status === "active" ? "text-green-600" : "text-yellow-600"}`}>{profile.status}</span></p>}
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard label="Total Products"   value={stats.totalProducts}     icon={Package}     color="blue" />
          <StatsCard label="In Stock"         value={stats.inStockProducts}   icon={CheckCircle} color="green" />
          <StatsCard label="Out of Stock"     value={stats.outOfStockProducts} icon={XCircle}    color="red" />
          <StatsCard label="Orders"           value={stats.totalOrders}       icon={ShoppingBag} color="purple" />
        </div>
      )}

      {profile && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6">
          <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-4 text-sm">Vendor Profile</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {[
              ["Business Name", profile.name],
              ["Email", profile.email],
              ["Phone", profile.phone || "—"],
              ["City", profile.city || "—"],
              ["Address", profile.address || "—"],
              ["Status", profile.status],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-gray-400 uppercase font-semibold">{label}</p>
                <p className="text-gray-900 dark:text-gray-100 font-medium mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
